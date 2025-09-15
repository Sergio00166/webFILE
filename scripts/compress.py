# Code by Sergio00166

from os.path import abspath, join
from re import sub as re_sub
from glob import glob
from sys import path


# Lightweight Jinja placeholder extractor (no UUIDs, deterministic)
def _extract_jinja_placeholders(text):
    out = []
    mapping = {}
    i = 0
    n = len(text)
    idx = 0
    while i < n:
        if text.startswith('{{', i):
            j = text.find('}}', i+2)
            if j == -1:
                token = text[i:]
                i = n
            else:
                token = text[i:j+2]
                i = j+2
            key = f"__JINJA2_{idx}__"
            mapping[key] = token
            out.append(key)
            idx += 1
        elif text.startswith('{%', i):
            j = text.find('%}', i+2)
            if j == -1:
                token = text[i:]
                i = n
            else:
                token = text[i:j+2]
                i = j+2
            key = f"__JINJA2_{idx}__"
            mapping[key] = token
            out.append(key)
            idx += 1
        elif text.startswith('{#', i):
            j = text.find('#}', i+2)
            if j == -1:
                token = text[i:]
                i = n
            else:
                token = text[i:j+2]
                i = j+2
            key = f"__JINJA2_{idx}__"
            mapping[key] = token
            out.append(key)
            idx += 1
        else:
            out.append(text[i])
            i += 1
    return ''.join(out), mapping


def _restore_placeholders(text, mapping):
    if not mapping:
        return text
    for k, v in mapping.items():
        text = text.replace(k, v)
    return text


# ---------------------------
# comment stripper (strings/template aware)
# ---------------------------

def _strip_comments(src):
    out = []
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        # strings and template literals
        if ch in ('"', "'", '`'):
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = src[i]
                out.append(c)
                if c == '\\' and i + 1 < n:
                    out.append(src[i+1])
                    i += 2
                    continue
                if quote == '`' and c == '$' and i + 1 < n and src[i+1] == '{':
                    # template expression: copy until matching }
                    out.append(src[i+1])
                    i += 2
                    depth = 1
                    while i < n and depth:
                        cc = src[i]
                        out.append(cc)
                        if cc == '{':
                            depth += 1
                        elif cc == '}':
                            depth -= 1
                        elif cc in ('"', "'", '`'):
                            # skip inner string
                            q = cc
                            i += 1
                            while i < n:
                                out.append(src[i])
                                if src[i] == '\\' and i + 1 < n:
                                    out.append(src[i+1]); i += 2; continue
                                if src[i] == q:
                                    break
                                i += 1
                        i += 1
                    continue
                if c == quote:
                    i += 1
                    break
                i += 1
            continue
        # comments
        if ch == '/' and i + 1 < n:
            nxt = src[i+1]
            if nxt == '/':
                # line comment
                i += 2
                while i < n and src[i] not in '\n\r':
                    i += 1
                out.append(' ')
                continue
            elif nxt == '*':
                # block comment
                i += 2
                while i + 1 < n and not (src[i] == '*' and src[i+1] == '/'):
                    i += 1
                i += 2 if i + 1 < n else 0
                out.append(' ')
                continue
        out.append(ch)
        i += 1
    return ''.join(out)


def _collapse_ws(s):
    return re_sub(r'\s+', ' ', s).strip()


# ---------------------------
# JS minifier (conservative but more aggressive than original)
# ---------------------------

def compress_js(src):
    """Conservative JS minifier with tighter spacing rules:
    - removes comments
    - collapses whitespace
    - removes spaces around punctuation and most operators
    - specifically removes spaces after semicolons and around assignments/comparisons
    - keeps semicolons where they are required and does NOT change control flow (no if->ternary).
    """
    s = _strip_comments(src)
    s = _collapse_ws(s)

    # remove spaces around common delimiters but keep minimal safety
    s = re_sub(r'\s*([{}\[\]()\.,:;])\s*', r'\1', s)

    # collapse multi-char comparison operators first
    s = re_sub(r'\s*(===|!==|==|!=|<=|>=)\s*', r'\1', s)
    # then single-char comparisons
    s = re_sub(r'\s*([<>])\s*', r'\1', s)

    # remove spaces around assignment '=' (after handling ==/=== above)
    s = re_sub(r'\s*=\s*', '=', s)

    # tighten other binary/unary operators (plus, minus, multiply, divide, modulus, bitwise, logical)
    s = re_sub(r'\s*([+\-*/%&|^!~])\s*', r'\1', s)

    # collapse identifier followed by space then '(' -> function call
    s = re_sub(r'([A-Za-z0-9_$])\s+\(', r'\1(', s)

    # remove space after keywords before '('
    s = re_sub(r'\b(if|for|while|switch|catch|with|function)\s+\(', r'\1(', s)

    # tighten else patterns but avoid touching 'else if'
    s = re_sub(r'\}\s*else\s*\{', r'}else{', s)
    s = re_sub(r'\)\s*else\s*\{', r')else{', s)

    # remove unnecessary semicolons before '}' (safe)
    s = re_sub(r';+}', r'}', s)

    # remove any remaining space after semicolons
    s = s.replace('; ', ';')

    return s.strip()


# ---------------------------
# CSS minifier
# ---------------------------

def compress_css(src):
    s = _strip_comments(src)
    s = _collapse_ws(s)
    # remove unnecessary spaces
    s = re_sub(r'\s*([{};:,>~])\s*', r'\1', s)
    # remove final semicolon before closing brace
    s = s.replace(';}', '}')
    return s.strip()


# ---------------------------
# HTML minifier with Jinja2 support
# ---------------------------

def _find_tag_end(src, start_idx):
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
        if ch == '"' or ch == "'":
            in_quote = ch
            i += 1
            continue
        if ch == '>':
            return i
        i += 1
    return -1


def compress_html(src):
    n = len(src)
    i = 0
    out = []
    while i < n:
        # Jinja tags: copy verbatim
        if src.startswith('{{', i) or src.startswith('{%', i) or src.startswith('{#', i):
            if src.startswith('{{', i):
                j = src.find('}}', i+2)
                if j == -1:
                    out.append(src[i:]); break
                out.append(src[i:j+2]); i = j+2; continue
            if src.startswith('{%', i):
                j = src.find('%}', i+2)
                if j == -1:
                    out.append(src[i:]); break
                out.append(src[i:j+2]); i = j+2; continue
            j = src.find('#}', i+2)
            if j == -1:
                out.append(src[i:]); break
            out.append(src[i:j+2]); i = j+2; continue

        ch = src[i]
        if ch == '<':
            tag_end = _find_tag_end(src, i)
            if tag_end == -1:
                out.append(src[i:]); break
            open_tag = src[i:tag_end+1]
            out.append(open_tag)
            low = src[i:tag_end+1].lower()
            i = tag_end + 1
            if low.startswith('<script'):
                # find closing
                close = src.lower().find('</script>', i)
                if close == -1:
                    content = src[i:]; i = n
                else:
                    content = src[i:close]; i = close
                preserved, mapping = _extract_jinja_placeholders(content)
                out.append(_restore_placeholders(compress_js(preserved), mapping))
                # append closing tag
                if i < n:
                    end = _find_tag_end(src, i)
                    if end == -1:
                        out.append(src[i:]); break
                    out.append(src[i:end+1]); i = end+1
                continue
            if low.startswith('<style'):
                close = src.lower().find('</style>', i)
                if close == -1:
                    content = src[i:]; i = n
                else:
                    content = src[i:close]; i = close
                preserved, mapping = _extract_jinja_placeholders(content)
                out.append(_restore_placeholders(compress_css(preserved), mapping))
                if i < n:
                    end = _find_tag_end(src, i)
                    if end == -1:
                        out.append(src[i:]); break
                    out.append(src[i:end+1]); i = end+1
                continue
            continue
        # text node: collapse whitespace
        start = i
        while i < n and src[i] not in '<{':
            i += 1
        chunk = src[start:i]
        out.append(re_sub(r'\s+', ' ', chunk))
    res = ''.join(out)
    res = re_sub(r'>\s+<', '><', res)
    return res.strip()


# ---------------------------
# File processing
# ---------------------------

def process_files(pattern, compressor):
    for p in glob(pattern):
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        compressed = compressor(content)
        if compressed != content:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(compressed)


if __name__ == '__main__':
    base = abspath(join(path[0], '..'))
    process_files(join(base, 'static', 'css', '*.css'), compress_css)
    process_files(join(base, 'static', 'js', '*.js'), compress_js)
    process_files(join(base, 'templates', '*.html'), compress_html)


 