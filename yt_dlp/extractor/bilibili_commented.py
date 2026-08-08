# -*- coding: utf-8 -*-
import base64
import functools
import hashlib
import itertools
import json
import math
import random
import re
import string
import time
import urllib.parse
import uuid

# 导入 yt-dlp 的核心基类和工具函数
# InfoExtractor 是所有视频/音频提取器的父类，提供下载网页、API请求、日志记录等底层方法
from .common import InfoExtractor, SearchInfoExtractor
from ..dependencies import Cryptodome
from ..networking.exceptions import HTTPError
from ..utils import (
    ExtractorError,
    GeoRestrictedError,
    InAdvancePagedList,
    OnDemandPagedList,
    bool_or_none,
    determine_ext,
    filter_dict,
    float_or_none,
    format_field,
    get_element_by_class,
    int_or_none,
    join_nonempty,
    make_archive_id,
    merge_dicts,
    mimetype2ext,
    parse_count,
    parse_qs,
    parse_resolution,
    qualities,
    smuggle_url,
    srt_subtitles_timecode,
    str_or_none,
    traverse_obj, # 极其强大的字典/列表安全取值工具，支持路径导航和过滤
    unified_timestamp,
    unsmuggle_url,
    url_or_none,
    urlencode_postdata,
    variadic,
)


class BilibiliBaseIE(InfoExtractor):
    """
    Bilibili 提取器的基类。
    这里封装了 B 站所有子类（普通视频、番剧、直播等）通用的核心逻辑：
    1. 提取音视频格式（DASH、FLAC、MP4 等）
    2. B 站最新的 WBI 接口签名算法（防爬虫校验）
    3. 获取字幕、弹幕、评论、分集和互动视频节点
    """
    _HEADERS = {'Referer': 'https://www.bilibili.com/'}
    _FORMAT_ID_RE = re.compile(r'-(\d+)\.m4s\?') # 用于从 m4s 链接中正则提取格式 ID
    _WBI_KEY_CACHE_TIMEOUT = 30  # WBI Key 缓存超时时间（30秒）
    _wbi_key_cache = {}

    @property
    def is_logged_in(self):
        """判断用户是否登录，检查 Cookie 中是否有 SESSDATA"""
        return bool(self._get_cookies('https://api.bilibili.com').get('SESSDATA'))

    def _check_missing_formats(self, play_info, formats):
        """
        检查当前视频是否有更高画质但未成功下载的格式。
        如果由于没有大会员权限导致某些高画质（如1080P+、4K）无法获取，会输出提示语引导用户登录。
        """
        parsed_qualities = set(traverse_obj(formats, (..., 'quality')))
        # 寻找存在于 support_formats 中，但不在 formats 里的画质
        missing_formats = join_nonempty(*[
            traverse_obj(fmt, 'new_description', 'display_desc', 'quality')
            for fmt in traverse_obj(play_info, (
                'support_formats', lambda _, v: v['quality'] not in parsed_qualities))], delim=', ')
        if missing_formats:
            self.to_screen(
                f'Format(s) {missing_formats} are missing; you have to '
                f'become a premium member to download them. {self._login_hint()}')

    def extract_formats(self, play_info):
        """
        核心方法：将 B 站接口返回的 play_info (如 DASH 数据或 DURL 分片数据)
        解析成 yt-dlp 通用的格式字典列表（formats）。
        """
        # 1. 建立画质 ID (quality) 到画质描述（如 "1080P 高清"）的映射关系
        format_names = {
            r['quality']: traverse_obj(r, 'new_description', 'display_desc')
            for r in traverse_obj(play_info, ('support_formats', lambda _, v: v['quality']))
        }

        # 2. 提取音频格式 (DASH 协议下，音频和视频通常是分离的)
        audios = traverse_obj(play_info, ('dash', (None, 'dolby'), 'audio', ..., {dict}))
        flac_audio = traverse_obj(play_info, ('dash', 'flac', 'audio')) # 无损音频支持
        if flac_audio:
            audios.append(flac_audio)
        
        # 将提取到的 DASH 音频节点转化为 yt-dlp 的格式字典
        formats = [{
            'url': traverse_obj(audio, 'baseUrl', 'base_url', 'url'),
            'ext': mimetype2ext(traverse_obj(audio, 'mimeType', 'mime_type')),
            'acodec': traverse_obj(audio, ('codecs', {str.lower})), # 音频编码，如 mp4a
            'vcodec': 'none', # 音频轨没有视频
            'tbr': float_or_none(audio.get('bandwidth'), scale=1000), # 码率 (kbps)
            'filesize': int_or_none(audio.get('size')),
            'format_id': str_or_none(audio.get('id')),
        } for audio in audios]

        # 3. 提取视频格式 (DASH 协议)
        formats.extend({
            'url': traverse_obj(video, 'baseUrl', 'base_url', 'url'),
            'ext': mimetype2ext(traverse_obj(video, 'mimeType', 'mime_type')),
            'fps': float_or_none(traverse_obj(video, 'frameRate', 'frame_rate')),
            'width': int_or_none(video.get('width')),
            'height': int_or_none(video.get('height')),
            'vcodec': video.get('codecs'), # 视频编码，如 avc, hev, av01
            'acodec': 'none' if audios else None,
            'dynamic_range': {126: 'DV', 125: 'HDR10'}.get(int_or_none(video.get('id'))), # 动态范围 (杜比视界/HDR)
            'tbr': float_or_none(video.get('bandwidth'), scale=1000),
            'filesize': int_or_none(video.get('size')),
            'quality': int_or_none(video.get('id')), # 画质等级 ID，如 80=1080P
            'format_id': traverse_obj(
                video, (('baseUrl', 'base_url'), {self._FORMAT_ID_RE.search}, 1),
                ('id', {str_or_none}), get_all=False),
            'format': format_names.get(video.get('id')),
        } for video in traverse_obj(play_info, ('dash', 'video', ...)))

        if formats:
            self._check_missing_formats(play_info, formats)

        # 4. 提取分片视频格式 (老旧的 durl 协议，如多段 flv/mp4)
        fragments = traverse_obj(play_info, ('durl', lambda _, v: url_or_none(v['url']), {
            'url': ('url', {url_or_none}),
            'duration': ('length', {float_or_none(scale=1000)}),
            'filesize': ('size', {int_or_none}),
        }))
        if fragments:
            formats.append({
                'url': fragments[0]['url'],
                'filesize': sum(traverse_obj(fragments, (..., 'filesize'))),
                # 如果有多个分片，使用 http_dash_segments 协议让下载器进行拼接
                **({
                    'fragments': fragments,
                    'protocol': 'http_dash_segments',
                } if len(fragments) > 1 else {}),
                **traverse_obj(play_info, {
                    'quality': ('quality', {int_or_none}),
                    'format_id': ('quality', {str_or_none}),
                    'format_note': ('quality', {format_names.get}),
                    'duration': ('timelength', {float_or_none(scale=1000)}),
                }),
                **parse_resolution(format_names.get(play_info.get('quality'))),
            })
        return formats

    def _get_wbi_key(self, video_id):
        """
        获取 B 站最新的 WBI 加密秘钥。
        该算法要求请求 `/x/web-interface/nav` 接口，从中获取 `img_url` 和 `sub_url` 的文件名，
        再经过打乱和重新切片，获得最终用于计算 MD5 签名的 Mixin Key。
        """
        # 判断缓存是否还有效，避免频繁请求 nav 接口被封 IP
        if time.time() < self._wbi_key_cache.get('ts', 0) + self._WBI_KEY_CACHE_TIMEOUT:
            return self._wbi_key_cache['key']

        session_data = self._download_json(
            'https://api.bilibili.com/x/web-interface/nav', video_id, note='Downloading wbi sign')

        # 提取图片和子地址的哈希后缀文件名，并拼接
        lookup = ''.join(traverse_obj(session_data, (
            'data', 'wbi_img', ('img_url', 'sub_url'),
            {lambda x: x.rpartition('/')[2].partition('.')[0]})))

        # B站前端 JS 中的混淆映射数组，用于打乱组合后的哈希字符
        mixin_key_enc_tab = [
            46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
            33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
            61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
            36, 20, 34, 44, 52,
        ]

        # 按照映射表重排 lookup 并截取前 32 位，作为真正的 Mixin Key
        self._wbi_key_cache.update({
            'key': ''.join(lookup[i] for i in mixin_key_enc_tab)[:32],
            'ts': time.time(),
        })
        return self._wbi_key_cache['key']

    def _sign_wbi(self, params, video_id):
        """
        对请求参数进行 WBI 签名。
        1. 加入 wts 时间戳（防止重放攻击）
        2. 对特殊字符进行过滤（!*()）并按参数 Key 的字母顺序升序排列
        3. 进行 URL 编码后拼接 Mixin Key 计算 MD5，获得 w_rid 签名值并拼入请求参数
        """
        params['wts'] = round(time.time())
        params = {
            k: ''.join(filter(lambda char: char not in "!'()*", str(v)))
            for k, v in sorted(params.items())
        }
        query = urllib.parse.urlencode(params)
        params['w_rid'] = hashlib.md5(f'{query}{self._get_wbi_key(video_id)}'.encode()).hexdigest()
        return params

    def _download_playinfo(self, bvid, cid, headers=None, query=None):
        """
        下载视频流媒体链接信息。
        该接口需要传入加密签名参数，并包含 fnval=4048 等高级编码（支持4K, HDR, Dolby等画质格式）。
        """
        params = {'bvid': bvid, 'cid': cid, 'fnval': 4048, **(query or {})}
        if self.is_logged_in:
            params.pop('try_look', None) # 登录后不再需要试看标志
        if qn := params.get('qn'):
            note = f'Downloading video format {qn} for cid {cid}'
        else:
            note = f'Downloading video formats for cid {cid}'

        # 通过 wbi 接口获取下载直链
        return self._download_json(
            'https://api.bilibili.com/x/player/wbi/playurl', bvid,
            query=self._sign_wbi(params, bvid), headers=headers, note=note)['data']

    def json2srt(self, json_data):
        """将 B 站的 JSON 格式 CC 字幕转换为通用的 SubRip (SRT) 格式字幕"""
        srt_data = ''
        for idx, line in enumerate(json_data.get('body') or []):
            srt_data += (f'{idx + 1}\n'
                         f'{srt_subtitles_timecode(line["from"])} --> {srt_subtitles_timecode(line["to"])}\n'
                         f'{line["content"]}\n\n')
        return srt_data

    def _get_subtitles(self, video_id, cid, aid=None):
        """获取视频关联的弹幕（XML 格式）和 CC 字幕（SRT 格式）"""
        subtitles = {
            'danmaku': [{
                'ext': 'xml',
                'url': f'https://comment.bilibili.com/{cid}.xml', # 弹幕公开接口
            }],
        }

        # 调用 v2 接口获取字幕列表
        video_info = self._download_json(
            'https://api.bilibili.com/x/player/wbi/v2', video_id,
            query={'aid': aid, 'cid': cid} if aid else {'bvid': video_id, 'cid': cid},
            note=f'Extracting subtitle info {cid}', headers=self._HEADERS)
        
        # 如果需要登录才能获取字幕，则发出警告
        if traverse_obj(video_info, ('data', 'need_login_subtitle')):
            self.report_warning(
                f'Subtitles are only available when logged in. {self._login_hint()}', only_once=True)
                
        # 遍历所有可用字幕语言，并转换格式
        for s in traverse_obj(video_info, (
                'data', 'subtitle', 'subtitles', lambda _, v: v['subtitle_url'] and v['lan'])):
            subtitles.setdefault(s['lan'], []).append({
                'ext': 'srt',
                'data': self.json2srt(self._download_json(s['subtitle_url'], video_id)),
            })
        return subtitles

    def _get_chapters(self, aid, cid):
        """获取视频内置的时间轴章节分段（View Points）"""
        chapters = aid and cid and self._download_json(
            'https://api.bilibili.com/x/player/wbi/v2', aid, query={'aid': aid, 'cid': cid},
            note='Extracting chapters', fatal=False, headers=self._HEADERS)
        return traverse_obj(chapters, ('data', 'view_points', ..., {
            'title': 'content',
            'start_time': 'from',
            'end_time': 'to',
        })) or None

    def _get_comments(self, aid):
        """获取视频的一级和二级评论数据（生成器）"""
        for idx in itertools.count(1):
            replies = traverse_obj(
                self._download_json(
                    f'https://api.bilibili.com/x/v2/reply?pn={idx}&oid={aid}&type=1&jsonp=jsonp&sort=2&_=1567227301685',
                    aid, note=f'Extracting comments from page {idx}', fatal=False),
                ('data', 'replies'))
            if not replies:
                return
            for children in map(self._get_all_children, replies):
                yield from children

    def _get_all_children(self, reply):
        """深度优先递归提取所有的嵌套子评论回复"""
        yield {
            'author': traverse_obj(reply, ('member', 'uname')),
            'author_id': traverse_obj(reply, ('member', 'mid')),
            'id': reply.get('rpid'),
            'text': traverse_obj(reply, ('content', 'message')),
            'timestamp': reply.get('ctime'),
            'parent': reply.get('parent') or 'root',
        }
        for children in map(self._get_all_children, traverse_obj(reply, ('replies', ...))):
            yield from children

    def _get_episodes_from_season(self, ss_id, url):
        """番剧/电影/纪录片：获取剧集（Season）里的每一集链接"""
        season_info = self._download_json(
            'https://api.bilibili.com/pgc/web/season/section', ss_id,
            note='Downloading season info', query={'season_id': ss_id},
            headers={'Referer': url, **self.geo_verification_headers()})

        for entry in traverse_obj(season_info, (
                'result', 'main_section', 'episodes',
                lambda _, v: url_or_none(v['share_url']) and v['id'])):
            yield self.url_result(entry['share_url'], BiliBiliBangumiIE, str_or_none(entry.get('id')))

    def _get_divisions(self, video_id, graph_version, edges, edge_id, cid_edges=None):
        """互动视频（Stein's Gate）：DFS 递归遍历所有选择分支图，建立节点与 CID 的对应关系"""
        cid_edges = cid_edges or {}
        division_data = self._download_json(
            'https://api.bilibili.com/x/stein/edgeinfo_v2', video_id,
            query={'graph_version': graph_version, 'edge_id': edge_id, 'bvid': video_id},
            note=f'Extracting divisions from edge {edge_id}')
        edges.setdefault(edge_id, {}).update(
            traverse_obj(division_data, ('data', 'story_list', lambda _, v: v['edge_id'] == edge_id, {
                'title': ('title', {str}),
                'cid': ('cid', {int_or_none}),
            }), get_all=False))

        edges[edge_id].update(traverse_obj(division_data, ('data', {
            'title': ('title', {str}),
            'choices': ('edges', 'questions', ..., 'choices', ..., {
                'edge_id': ('id', {int_or_none}),
                'cid': ('cid', {int_or_none}),
                'text': ('option', {str}),
            }),
        })))
        
        cid_edges.setdefault(edges[edge_id]['cid'], {})[edge_id] = edges[edge_id]
        for choice in traverse_obj(edges, (edge_id, 'choices', ...)):
            if choice['edge_id'] not in edges:
                edges[choice['edge_id']] = {'cid': choice['cid']}
                self._get_divisions(video_id, graph_version, edges, choice['edge_id'], cid_edges=cid_edges)
        return cid_edges

    def _get_interactive_entries(self, video_id, cid, metainfo, headers=None):
        """互动视频：获取所有剧情分歧分支节点的信息，作为播放列表子条目导出"""
        graph_version = traverse_obj(
            self._download_json(
                'https://api.bilibili.com/x/player/wbi/v2', video_id,
                'Extracting graph version', query={'bvid': video_id, 'cid': cid}, headers=headers),
            ('data', 'interaction', 'graph_version', {int_or_none}))
        cid_edges = self._get_divisions(video_id, graph_version, {1: {'cid': cid}}, 1)
        for cid, edges in cid_edges.items():
            play_info = self._download_playinfo(video_id, cid, headers=headers, query={'try_look': 1})
            yield {
                **metainfo,
                'id': f'{video_id}_{cid}',
                'title': f'{metainfo.get("title")} - {next(iter(edges.values())).get("title")}',
                'formats': self.extract_formats(play_info),
                'description': f'{json.dumps(edges, ensure_ascii=False)}\n{metainfo.get("description", "")}',
                'duration': float_or_none(play_info.get('timelength'), scale=1000),
                'subtitles': self.extract_subtitles(video_id, cid),
            }


class BiliBiliIE(BilibiliBaseIE):
    """
    常规 B 站视频提取器（BV / av 号视频）。
    支持普通单视频、多 P 分集视频（分 P 播放列表）、互动视频。
    """
    IE_NAME = 'bilibili'
    IE_DESC = 'Bilibili'
    
    # 匹配规范的 B 站视频播放链接正则
    _VALID_URL = r'https?://(?:www\.)?bilibili\.com/(?:video/|festival/[^/?#]+\?(?:[^#]*&)?bvid=)(?P<prefix>[aAbB][vV])(?P<id>[^/?#&]+)'

    # 留存 1 个典型测试用例用于单元测试
    _TESTS = [{
        'url': 'https://www.bilibili.com/video/BV13x41117TL',
        'info_dict': {
            'id': 'BV13x41117TL',
            'title': '阿滴英文｜英文歌分享#6 "Closer',
            'ext': 'mp4',
            'description': '滴妹今天唱Closer给你听! 有史以来，被推最多次也是最久的歌曲，其实歌词跟我原本想像差蛮多的，不过还是好听！ 微博@阿滴英文',
            'uploader_id': '65880958',
            'uploader': '阿滴英文',
            'thumbnail': r're:^https?://.*\.(jpg|jpeg|png)$',
            'duration': 554.117,
            'tags': list,
            'comment_count': int,
            'upload_date': '20170301',
            'timestamp': 1488353834,
            'like_count': int,
            'view_count': int,
            '_old_archive_ids': ['bilibili 8903802_part1'],
        },
    }]

    def _real_extract(self, url):
        """
        主要的解析提取方法。
        解析流程：
        1. 匹配获得 video_id (BV 或 av 号)
        2. 下载网页，提取网页中的 window.__INITIAL_STATE__ 配置数据（包含标题、UP主、各分 P 及其 CID 等关键信息）
        3. 如果是多 P 视频，且用户没有指定单 P（即无 ?p=x 参数），则提取为 Playlist（播放列表）
        4. 如果是单视频，获取对应的流媒体播放链接 (playinfo) 并解包格式
        5. 返回 yt-dlp 能读取的视频元数据字典
        """
        video_id, prefix = self._match_valid_url(url).group('id', 'prefix')
        headers = self.geo_verification_headers()
        
        # 下载网页，并获取其重定向后的最终 URL
        webpage, urlh = self._download_webpage_handle(url, video_id, headers=headers)
        if not self._match_valid_url(urlh.url):
            return self.url_result(urlh.url) # 若发生域外跳转，交给其他 extractor 处理

        headers['Referer'] = url

        # 尝试在网页 HTML 源码中查找包含初始化状态的 JSON 字符串
        initial_state = self._search_json(r'window\.__INITIAL_STATE__\s*=', webpage, 'initial state', video_id, default=None)
        if not initial_state:
            # 针对触发风控阻断时的后备处理（获取风险跳转）
            if self._search_json(r'\bwindow\._riskdata_\s*=', webpage, 'risk', video_id, default={}).get('v_voucher'):
                raise ExtractorError('You have exceeded the rate limit. Try again later', expected=True)
            # 通过备用 API 获取详情
            query = {'platform': 'web'}
            prefix = prefix.upper()
            if prefix == 'BV':
                query['bvid'] = prefix + video_id
            elif prefix == 'AV':
                query['aid'] = video_id
            detail = self._download_json(
                'https://api.bilibili.com/x/web-interface/wbi/view/detail', video_id,
                note='Downloading redirection URL', errnote='Failed to download redirection URL',
                query=self._sign_wbi(query, video_id), headers=headers)
            new_url = traverse_obj(detail, ('data', 'View', 'redirect_url', {url_or_none}))
            if new_url and BiliBiliBangumiIE.suitable(new_url):
                return self.url_result(new_url, BiliBiliBangumiIE)
            raise ExtractorError('Unable to extract initial state')

        # 错误代码逻辑处理（例如未登录或地区受限）
        if traverse_obj(initial_state, ('error', 'trueCode')) == -403:
            self.raise_login_required()
        if traverse_obj(initial_state, ('error', 'trueCode')) == -404:
            raise ExtractorError(
                'This video may be deleted or geo-restricted. '
                'You might want to try a VPN or a proxy server (with --proxy)', expected=True)

        # 区分是普通视频页面还是官方“拜年纪/节日”活动页
        is_festival = 'videoData' not in initial_state
        if is_festival:
            video_data = initial_state['videoInfo']
        else:
            video_data = initial_state['videoData']

        video_id, title = video_data['bvid'], video_data.get('title')

        # 获取视频的 P 数（分P列表）
        page_list_json = (not is_festival and traverse_obj(
            self._download_json(
                'https://api.bilibili.com/x/player/pagelist', video_id,
                fatal=False, query={'bvid': video_id, 'jsonp': 'jsonp'},
                note='Extracting videos in anthology', headers=headers),
            'data', expected_type=list)) or []
        is_anthology = len(page_list_json) > 1

        # 获取当前 URL 参数里的分 P 索引（如 URL 尾部的 ?p=2）
        part_id = int_or_none(parse_qs(url).get('p', [None])[-1])
        # 如果是多 P 且用户未指定特定的 P，则提取为整个播放列表返回
        if is_anthology and not part_id and self._yes_playlist(video_id, video_id):
            return self.playlist_from_matches(
                page_list_json, video_id, title, ie=BiliBiliIE,
                getter=lambda entry: f'https://www.bilibili.com/video/{video_id}?p={entry["page"]}')

        # 如果是指定单 P，需要追加 P 命名后缀
        if is_anthology:
            part_id = part_id or 1
            title += f' p{part_id:02d} {traverse_obj(page_list_json, (part_id - 1, "part")) or ""}'

        aid = video_data.get('aid')
        old_video_id = format_field(aid, None, f'%s_part{part_id or 1}')
        cid = traverse_obj(video_data, ('pages', part_id - 1, 'cid')) if part_id else video_data.get('cid')

        festival_info = {}
        if is_festival:
            festival_info = traverse_obj(initial_state, {
                'uploader': ('videoInfo', 'upName'),
                'uploader_id': ('videoInfo', 'upMid', {str_or_none}),
                'like_count': ('videoStatus', 'like', {int_or_none}),
                'thumbnail': ('sectionEpisodes', lambda _, v: v['bvid'] == video_id, 'cover'),
            }, get_all=False)

        # 整理出视频的基本元数据字典
        metainfo = {
            **traverse_obj(initial_state, {
                'uploader': ('upData', 'name'),
                'uploader_id': ('upData', 'mid', {str_or_none}),
                'like_count': ('videoData', 'stat', 'like', {int_or_none}),
                'tags': ('tags', ..., 'tag_name'),
                'thumbnail': ('videoData', 'pic', {url_or_none}),
            }),
            **festival_info,
            **traverse_obj(video_data, {
                'description': 'desc',
                'timestamp': ('pubdate', {int_or_none}),
                'view_count': (('viewCount', ('stat', 'view')), {int_or_none}),
                'comment_count': ('stat', 'reply', {int_or_none}),
            }, get_all=False),
            'id': f'{video_id}{format_field(part_id, None, "_p%d")}',
            '_old_archive_ids': [make_archive_id(self, old_video_id)] if old_video_id else None,
            'title': title,
            'http_headers': {'Referer': url},
        }

        # 判断是否为互动视频（“石之门”属性）
        is_interactive = traverse_obj(video_data, ('rights', 'is_stein_gate'))
        if is_interactive:
            return self.playlist_result(
                self._get_interactive_entries(video_id, cid, metainfo, headers=headers), **metainfo,
                duration=traverse_obj(initial_state, ('videoData', 'duration', {int_or_none})),
                __post_extractor=self.extract_comments(aid))

        # 获取播放直链（DASH 格式）
        play_info = None
        if self.is_logged_in:
            play_info = traverse_obj(
                self._search_json(r'window\.__playinfo__\s*=', webpage, 'play info', video_id, default=None),
                ('data', {dict}))
        if not play_info:
            play_info = self._download_playinfo(video_id, cid, headers=headers, query={'try_look': 1})
        formats = self.extract_formats(play_info)

        # 检查是否为充电专属/充电专享视频，并提供警告提示
        if video_data.get('is_upower_exclusive'):
            high_level = traverse_obj(initial_state, ('elecFullInfo', 'show_info', 'high_level', {dict})) or {}
            msg = f'{join_nonempty("title", "sub_title", from_dict=high_level, delim="，")}. {self._login_hint()}'
            if not formats:
                raise ExtractorError(f'This is a supporter-only video: {msg}', expected=True)
            if '试看' in traverse_obj(play_info, ('accept_description', ..., {str})):
                self.report_warning(
                    f'This is a supporter-only video, only the preview will be extracted: {msg}',
                    video_id=video_id)

        # 如果不支持 DASH，处理传统分片格式
        if not traverse_obj(play_info, 'dash'):
            has_qn = lambda x: x in traverse_obj(formats, (..., 'quality'))
            for qn in traverse_obj(play_info, ('accept_quality', lambda _, v: not has_qn(v), {int})):
                formats.extend(traverse_obj(
                    self.extract_formats(self._download_playinfo(video_id, cid, headers=headers, query={'qn': qn})),
                    lambda _, v: not has_qn(v['quality'])))
            self._check_missing_formats(play_info, formats)
            flv_formats = traverse_obj(formats, lambda _, v: v['fragments'])
            if flv_formats and len(flv_formats) < len(formats):
                if not self._configuration_arg('prefer_multi_flv'):
                    dropped_fmts = ', '.join(
                        f'{f.get("format_note")} ({f.get("format_id")})' for f in flv_formats)
                    formats = traverse_obj(formats, lambda _, v: not v.get('fragments'))
                    if dropped_fmts:
                        self.to_screen(
                            f'Dropping incompatible flv format(s) {dropped_fmts} since mp4 is available. '
                            'To extract flv, pass --extractor-args "bilibili:prefer_multi_flv"')
                else:
                    formats = traverse_obj(
                        formats, lambda _, v: v['quality'] == int(self._configuration_arg('prefer_multi_flv')[0]),
                    ) or [max(flv_formats, key=lambda x: x['quality'])]

        # 处理有多段分片的 FLV 格式视频（将首尾切片包装成 multi_video 结构下载）
        if traverse_obj(formats, (0, 'fragments')):
            return {
                **metainfo,
                '_type': 'multi_video',
                'entries': [{
                    'id': f'{metainfo["id"]}_{idx}',
                    'title': metainfo['title'],
                    'http_headers': metainfo['http_headers'],
                    'formats': [{
                        **fragment,
                        'format_id': formats[0].get('format_id'),
                    }],
                    'subtitles': self.extract_subtitles(video_id, cid) if idx == 0 else None,
                    '__post_extractor': self.extract_comments(aid) if idx == 0 else None,
                } for idx, fragment in enumerate(formats[0]['fragments'])],
                'duration': float_or_none(play_info.get('timelength'), scale=1000),
            }

        # 正常单轨道音视频下载信息返回
        return {
            **metainfo,
            'formats': formats,
            'duration': float_or_none(play_info.get('timelength'), scale=1000),
            'chapters': self._get_chapters(aid, cid),
            'subtitles': self.extract_subtitles(video_id, cid),
            '__post_extractor': self.extract_comments(aid),
        }


class BiliBiliBangumiIE(BilibiliBaseIE):
    """
    B站番剧/电影/电视剧/纪录片提取器 (Bilibili Bangumi)。
    URL 类似于: `https://www.bilibili.com/bangumi/play/ep123456`
    """
    _VALID_URL = r'https?://(?:www\.)?bilibili\.com/bangumi/play/ep(?P<id>\d+)'

    _TESTS = [{
        'url': 'https://www.bilibili.com/bangumi/play/ep21495/',
        'info_dict': {
            'id': '21495',
            'ext': 'mp4',
            'series': '悠久之翼',
            'series_id': '774',
            'season': '第二季',
            'season_id': '1182',
            'season_number': 2,
            'episode': 'forever／ef',
            'episode_id': '21495',
            'episode_number': 12,
            'title': '12 forever／ef',
            'duration': 1420.791,
            'timestamp': 1320412200,
            'upload_date': '20111104',
            'thumbnail': r're:^https?://.*\.(jpg|jpeg|png)$',
        },
    }]

    def _real_extract(self, url):
        episode_id = self._match_id(url)
        headers = self.geo_verification_headers()
        webpage = self._download_webpage(url, episode_id, headers=headers)

        # 检查是否由于地区版权原因被拦截，或者需要登录大会员
        if '您所在的地区无法观看本片' in webpage:
            raise GeoRestrictedError('This video is restricted')
        elif '正在观看预览，大会员免费看全片' in webpage:
            self.raise_login_required('This video is for premium members only')

        headers['Referer'] = url

        # 番剧视频播放源信息的提取。优先匹配页面 SSR 静态渲染数据，若无则请求官方 API 接口
        play_info = (
            self._search_json(
                r'playurlSSRData\s*=', webpage, 'embedded page info', episode_id,
                end_pattern='\n', default=None)
            or self._download_json(
                'https://api.bilibili.com/pgc/player/web/v2/playurl', episode_id,
                'Extracting episode', query={'fnval': 12240, 'ep_id': episode_id},
                headers=headers))

        # 兼容处理 play_info 的多种不同 JSON 数据结构嵌套
        status_code = play_info.get('code')
        if 'raw' in play_info:
            play_info = play_info['raw']
        if 'data' in play_info:
            play_info = play_info['data']
        if status_code is None:
            status_code = play_info.get('code')
        if 'result' in play_info:
            play_info = play_info['result']

        geo_blocked = traverse_obj(play_info, (
            'plugins', lambda _, v: v['name'] == 'AreaLimitPanel', 'config', 'is_block', {bool}, any))
        premium_only = status_code == -10403

        video_info = traverse_obj(play_info, ('video_info', {dict})) or {}
        formats = self.extract_formats(video_info)

        # 如果没提取到格式，结合属性进行二次校验拦截
        if not formats:
            if geo_blocked:
                self.raise_geo_restricted()
            elif premium_only or '成为大会员抢先看' in webpage or '开通大会员观看' in webpage:
                self.raise_login_required('This video is for premium members only')

        # 如果只有预览片段可用，给出大会员登录引导提示
        if traverse_obj(play_info, ((
            ('play_check', 'play_detail'),
            'play_video_type',
        ), any, {lambda x: x in ('PLAY_PREVIEW', 'preview')})):
            self.report_warning(
                'Only preview format is available, '
                f'you have to become a premium member to access full video. {self._login_hint()}')

        # 请求番剧的详情（Season 视角下的系列、季、集数等）
        bangumi_info = self._download_json(
            'https://api.bilibili.com/pgc/view/web/season', episode_id, 'Get episode details',
            query={'ep_id': episode_id}, headers=headers)['result']

        # 从番剧列表中寻找匹配当前小集 (episode) 的信息
        episode_number, episode_info = next((
            (idx, ep) for idx, ep in enumerate(traverse_obj(
                bangumi_info, (('episodes', ('section', ..., 'episodes')), ..., {dict})), 1)
            if str_or_none(ep.get('id')) == episode_id), (1, {}))

        season_id = bangumi_info.get('season_id')
        season_number, season_title = season_id and next((
            (idx + 1, e.get('season_title')) for idx, e in enumerate(
                traverse_obj(bangumi_info, ('seasons', ...)))
            if e.get('season_id') == season_id
        ), (None, None))

        aid = episode_info.get('aid')

        # 返回番剧特有的规范化元数据格式
        return {
            'id': episode_id,
            'formats': formats,
            **traverse_obj(bangumi_info, {
                'series': ('series', 'series_title', {str}), # 主系列名（例如“鬼灭之刃”）
                'series_id': ('series', 'series_id', {str_or_none}),
                'thumbnail': ('square_cover', {url_or_none}),
            }),
            **traverse_obj(episode_info, {
                'episode': ('long_title', {str}), # 单集长标题（如“残酷”）
                'episode_number': ('title', {int_or_none}, {lambda x: x or episode_number}), # 单集索引
                'timestamp': ('pub_time', {int_or_none}),
                'title': {lambda v: v and join_nonempty('title', 'long_title', delim=' ', from_dict=v)},
            }),
            'episode_id': episode_id,
            'season': str_or_none(season_title), # 单季名称（如“立志篇”）
            'season_id': str_or_none(season_id),
            'season_number': season_number,
            'duration': float_or_none(video_info.get('timelength'), scale=1000),
            'subtitles': self.extract_subtitles(episode_id, episode_info.get('cid'), aid=aid),
            '__post_extractor': self.extract_comments(aid),
            'http_headers': {'Referer': url},
        } 


class BiliLiveIE(InfoExtractor):
    """
    B站直播提取器 (Bilibili Live)。
    URL 格式如: `https://live.bilibili.com/12345`
    """
    _VALID_URL = r'https?://live\.bilibili\.com/(?:blanc/)?(?P<id>\d+)'

    _TESTS = [{
        'url': 'https://live.bilibili.com/196',
        'info_dict': {
            'id': '33989',
            'description': '周六杂谈回，其他时候随机游戏。',
            'ext': 'flv',
            'title': '太空狼人杀联动，不被爆杀就算赢',
            'thumbnail': 'https://i0.hdslb.com/bfs/live/new_room_cover/e607bc1529057ef4b332e1026e62cf46984c314d.jpg',
            'timestamp': 1650802769,
        },
        'skip': 'not live',
    }]

    # 码率/画质映射字典
    _FORMATS = {
        80: {'format_id': 'low', 'format_note': '流畅'},
        150: {'format_id': 'high_res', 'format_note': '高清'},
        250: {'format_id': 'ultra_high_res', 'format_note': '超清'},
        400: {'format_id': 'blue_ray', 'format_note': '蓝光'},
        10000: {'format_id': 'source', 'format_note': '原画'},
        20000: {'format_id': '4K', 'format_note': '4K'},
        30000: {'format_id': 'dolby', 'format_note': '杜比'},
    }

    _quality = staticmethod(qualities(list(_FORMATS)))

    def _call_api(self, path, room_id, query):
        """调用 B站直播开放平台的 API"""
        api_result = self._download_json(f'https://api.live.bilibili.com/{path}', room_id, query=query)
        if api_result.get('code') != 0:
            raise ExtractorError(api_result.get('message') or 'Unable to download JSON metadata')
        return api_result.get('data') or {}

    def _parse_formats(self, qn, fmt):
        """解析直播流编码格式信息"""
        for codec in fmt.get('codec') or []:
            if codec.get('current_qn') != qn:
                continue
            for url_info in codec['url_info']:
                yield {
                    'url': f'{url_info["host"]}{codec["base_url"]}{url_info["extra"]}',
                    'ext': fmt.get('format_name'), # 直播流格式（通常是 flv 或 m3u8）
                    'vcodec': codec.get('codec_name'), # 视频编码，如 h264/h265
                    'quality': self._quality(qn),
                    **self._FORMATS[qn],
                }

    def _real_extract(self, url):
        room_id = self._match_id(url)
        # 获取直播间状态和基础信息
        room_data = self._call_api('room/v1/Room/get_info', room_id, {'id': room_id})
        # live_status 状态: 0=未开播，1=直播中，2=轮播中
        if room_data.get('live_status') == 0:
            raise ExtractorError('Streamer is not live', expected=True)

        formats = []
        # 对每一种画质请求播放流直链
        for qn in self._FORMATS:
            stream_data = self._call_api('xlive/web-room/v2/index/getRoomPlayInfo', room_id, {
                'room_id': room_id,
                'qn': qn,
                'codec': '0,1',
                'format': '0,2',
                'mask': '0',
                'no_playurl': '0',
                'platform': 'web',
                'protocol': '0,1',
            })
            for fmt in traverse_obj(stream_data, ('playurl_info', 'playurl', 'stream', ..., 'format', ...)) or []:
                formats.extend(self._parse_formats(qn, fmt))

        # 返回直播元数据，包含 is_live 标志（yt-dlp 会启用直播循环录制机制）
        return {
            'id': room_id,
            'title': room_data.get('title'),
            'description': room_data.get('description'),
            'thumbnail': room_data.get('user_cover'),
            'timestamp': stream_data.get('live_time'),
            'formats': formats,
            'is_live': True,
            'http_headers': {
                'Referer': url,
            },
        }
