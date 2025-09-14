# Code by Sergio00166
"""
Conservative compressor that:
 - strips comments and collapses whitespace in JS and CSS,
 - compresses inline <script> and <style> blocks inside HTML,
 - preserves Jinja2 template tags: {{ ... }}, {% ... %}, {# ... #} (untouched),
 - avoids aggressive regex-based JS transformations (no semicolon / operator merging).
Run before deploying.
"""

from re import sub as re_sub
from glob import glob
from sys import path
import os
import itertools
import uuid

# ---------------------------
# Basic helpers (from your original)
# ---------------------------
def _strip_comments(src):
    out, i, n = [], 0, len(src)
    while i < n:
        ch = src[i]
        if ch in "'\"`":  # string or template-like literal
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = src[i]
                out.append(c)
                # preserve escapes
                if c == "\\" and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                # stop at the matching quote (conservative for templates)
                if c == quote:
                    i += 1
                    break
                i += 1
        elif ch == '/' and i + 1 < n:
            nxt = src[i + 1]
            if nxt == '/':  # line comment
                i += 2
                while i < n and src[i] not in '\n\r':
                    i += 1
                out.append(' ')
                if i < n and src[i] in '\n\r':
                    i += 1
            elif nxt == '*':  # block comment
                i += 2
                while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                    i += 1
                if i + 1 < n:
                    i += 2
                out.append(' ')
            else:
                out.append(ch)
                i += 1
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def _collapse_ws(s):
    """Collapse runs of whitespace to a single space and trim ends."""
    return re_sub(r'\s+', ' ', s).strip()


# ---------------------------
# Conservative compressors
# ---------------------------

def compress_js_safe(src):
    """Conservative JS compressor: strip comments, collapse whitespace,
    and only apply safe spacing reductions (around braces, commas, calls).
    Does NOT remove semicolons or aggressively change operators."""
    s = _collapse_ws(_strip_comments(src))

    subs = [
        (r'\s*([{}\[\]])\s*', r'\1'),
        (r',\s*', r','),
        (r'([A-Za-z0-9_$])\s+\(', r'\1('),  # ident (
        (r'\(\s+', '('), (r'\s+\)', ')'),
        (r'\b(if|for|while|switch|catch|with)\s+\(', r'\1('),
        (r'\}\s*else', r'}else'), (r'\)\s*else', r')else'),
    ]
    for pat, repl in subs:
        s = re_sub(pat, repl, s)
    return s.strip()


def compress_css(src):
    """Conservative CSS compressor: remove comments and collapse whitespace
    and tidy simple separators."""
    s = _collapse_ws(_strip_comments(src))
    subs = [
        (r'\s*\{\s*', '{'), (r'\s*\}\s*', '}'),
        (r'\s*;\s*', ';'), (r'\s*:\s*', ':'), (r'\s*,\s*', ','),
    ]
    for pat, repl in subs:
        s = re_sub(pat, repl, s)
    return s.replace(';}', '}').strip()


# ---------------------------
# Jinja2-aware placeholder helpers
# ---------------------------
def _extract_jinja_placeholders(text):
    """
    Replace Jinja2 tags with placeholders and return (text_with_placeholders, mapping).
    Recognized starts: {{, {%, {#
    Ends: }}, %}, #}
    This is a single-pass conservative extractor (non-greedy).
    """
    out = []
    mapping = {}
    i = 0
    n = len(text)
    while i < n:
        if text.startswith('{{', i):
            start = i
            i += 2
            # find next '}}'
            end = text.find('}}', i)
            if end == -1:
                # malformed, copy rest
                token = text[start:]
                i = n
            else:
                token = text[start:end+2]
                i = end + 2
            key = f"__JINJA2_{uuid.uuid4().hex}__"
            mapping[key] = token
            out.append(key)
        elif text.startswith('{%', i):
            start = i
            i += 2
            end = text.find('%}', i)
            if end == -1:
                token = text[start:]
                i = n
            else:
                token = text[start:end+2]
                i = end + 2
            key = f"__JINJA2_{uuid.uuid4().hex}__"
            mapping[key] = token
            out.append(key)
        elif text.startswith('{#', i):
            start = i
            i += 2
            end = text.find('#}', i)
            if end == -1:
                token = text[start:]
                i = n
            else:
                token = text[start:end+2]
                i = end + 2
            key = f"__JINJA2_{uuid.uuid4().hex}__"
            mapping[key] = token
            out.append(key)
        else:
            out.append(text[i])
            i += 1
    return ''.join(out), mapping


def _restore_placeholders(text, mapping):
    if not mapping:
        return text
    # placeholders are unique tokens that won't collide with source
    for k, v in mapping.items():
        text = text.replace(k, v)
    return text


# ---------------------------
# HTML scanner and inline block compression
# ---------------------------

def _find_tag_end(src, start_idx):
    """
    Find end index of a tag opening starting at start_idx (where src[start_idx] == '<').
    Correctly skips over quoted attribute values.
    Returns index of '>' or -1.
    """
    i = start_idx + 1
    n = len(src)
    in_quote = None
    while i < n:
        ch = src[i]
        if in_quote:
            if ch == '\\':
                i += 2
                continue
            if ch == in_quote:
                in_quote = None
            i += 1
            continue
        else:
            if ch == '"' or ch == "'":
                in_quote = ch
                i += 1
                continue
            if ch == '>':
                return i
            i += 1
    return -1


def _lower_startswith(s, idx, prefix):
    return s[idx:idx+len(prefix)].lower() == prefix.lower()


def compress_html_safe(src):
    """
    Scan HTML, preserve Jinja2 tags, compress inline <script> and <style> blocks
    using the conservative compressors above.
    For other text nodes, collapse runs of whitespace to a single space
    (but never collapse across Jinja2 placeholders).
    """
    n = len(src)
    i = 0
    out_parts = []
    # We'll accumulate plain text segments and collapse their whitespace at chunk boundaries
    while i < n:
        ch = src[i]
        # Jinja2 tags: preserve verbatim
        if src.startswith('{{', i) or src.startswith('{%', i) or src.startswith('{#', i):
            # find the matching end as in placeholder helper
            if src.startswith('{{', i):
                end = src.find('}}', i+2)
                if end == -1:
                    token = src[i:]
                    i = n
                else:
                    token = src[i:end+2]
                    i = end + 2
            elif src.startswith('{%', i):
                end = src.find('%}', i+2)
                if end == -1:
                    token = src[i:]
                    i = n
                else:
                    token = src[i:end+2]
                    i = end + 2
            else:  # {#
                end = src.find('#}', i+2)
                if end == -1:
                    token = src[i:]
                    i = n
                else:
                    token = src[i:end+2]
                    i = end + 2
            out_parts.append(token)
            continue

        # Tag opening?
        if ch == '<':
            tag_end = _find_tag_end(src, i)
            if tag_end == -1:
                # malformed tag: append rest and break
                out_parts.append(src[i:])
                break
            open_tag = src[i:tag_end+1]
            # detect if this is a <script ...> or <style ...> opening tag (case-insensitive)
            # we must not assume no attributes: check startswith "<script" with whitespace permitted
            if _lower_startswith(src, i, '<script'):

                # append opening tag as-is
                out_parts.append(open_tag)
                i = tag_end + 1
                # find closing </script> (case-insensitive)
                lower_src = src.lower()
                close_marker = '</script>'
                close_idx = lower_src.find(close_marker, i)
                if close_idx == -1:
                    # no closing tag -> append rest and stop
                    script_content = src[i:]
                    i = n
                else:
                    script_content = src[i:close_idx]
                    i = close_idx
                # compress script_content BUT preserve inner Jinja2 blocks
                preserved, mapping = _extract_jinja_placeholders(script_content)
                compressed = compress_js_safe(preserved)
                restored = _restore_placeholders(compressed, mapping)
                out_parts.append(restored)
                # append closing tag if present
                if i < n:
                    # copy until '>' of closing tag
                    close_end = _find_tag_end(src, i)
                    if close_end == -1:
                        out_parts.append(src[i:])
                        i = n
                    else:
                        out_parts.append(src[i:close_end+1])
                        i = close_end + 1
                continue

            elif _lower_startswith(src, i, '<style'):
                # append opening tag as-is
                out_parts.append(open_tag)
                i = tag_end + 1
                lower_src = src.lower()
                close_marker = '</style>'
                close_idx = lower_src.find(close_marker, i)
                if close_idx == -1:
                    style_content = src[i:]
                    i = n
                else:
                    style_content = src[i:close_idx]
                    i = close_idx
                # preserve Jinja2 inside style, then compress css
                preserved, mapping = _extract_jinja_placeholders(style_content)
                compressed = compress_css(preserved)
                restored = _restore_placeholders(compressed, mapping)
                out_parts.append(restored)
                # append closing tag
                if i < n:
                    close_end = _find_tag_end(src, i)
                    if close_end == -1:
                        out_parts.append(src[i:])
                        i = n
                    else:
                        out_parts.append(src[i:close_end+1])
                        i = close_end + 1
                continue
            else:
                # Normal tag: append as-is and continue
                out_parts.append(open_tag)
                i = tag_end + 1
                continue

        # Plain text node: accumulate until next special char (< or {)
        # We'll accumulate minimal chunk and collapse whitespace within it.
        start = i
        while i < n and src[i] not in '<{':
            i += 1
        chunk = src[start:i]
        # The chunk may contain Jinja2-like sequences like '{% ... %}' if we hit them at boundary,
        # but we only process plain text here.
        # Collapse whitespace inside chunk to a single space
        chunk_collapsed = re_sub(r'\s+', ' ', chunk)
        out_parts.append(chunk_collapsed)
        continue

    # join parts and final trimming: keep as-is except collapse runs of whitespace between parts that are plain text tokens
    result = ''.join(out_parts)

    # final tidy: collapse runs of spaces between tags, but keep single spaces where needed
    # replace sequences of '>\s+<' with '><' (strip spaces between tags)
    result = re_sub(r'>\s+<', '><', result)
    # trim overall
    return result.strip()


# ---------------------------
# File processing
# ---------------------------

def process_files(pattern, compressor):
    for p in glob(pattern):
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
        compressed = compressor(content)
        # write only if changed to avoid touching mtimes unnecessarily
        if compressed != content:
            with open(p, "w", encoding="utf-8") as f:
                f.write(compressed)


if __name__ == '__main__':
    base = os.path.abspath(os.path.join(path[0], ".."))
    process_files(os.path.join(base, "static", "css", "*.css"), compress_css)
    process_files(os.path.join(base, "static", "js", "*.js"), compress_js_safe)
    process_files(os.path.join(base, "templates", "*.html"), compress_html_safe)
