# Code by Sergio00166

"""
This just compresses all CSS and JS
and the HTML templates in a safe way.
Run it before deploying.
"""

from re import split as re_split
from re import sub as re_sub
from glob import glob
from sys import path


def _strip_comments(src):
    out, i, n = [], 0, len(src)
    while i < n:
        ch = src[i]
        if ch in "'\"`":  # string literal
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = src[i]
                out.append(c)
                if c == "\\" and i + 1 < n:
                    out.append(src[i + 1]); i += 2; continue
                if c == quote: i += 1; break
                i += 1
        elif ch == '/' and i + 1 < n:
            nxt = src[i + 1]
            if nxt == '/':  # line comment
                i += 2
                while i < n and src[i] not in '\n\r': i += 1
                out.append(' '); i += (i < n and src[i] in '\n\r')
            elif nxt == '*':  # block comment
                i += 2
                while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'): i += 1
                i += 2 if i + 1 < n else 0
                out.append(' ')
            else:
                out.append(ch); i += 1
        else:
            out.append(ch); i += 1
    return ''.join(out)


def _collapse_ws(s): return re_sub(r'\s+', ' ', s).strip()


def compress_js(src):
    s = _collapse_ws(_strip_comments(src))
    subs = [
        (r"\s*([{};,\[\]])\s*", r"\1"),
        (r'([A-Za-z0-9_$])\s+\(', r'\1('),
        (r'\(\s+', '('), (r'\s+\)', ')'), (r'\)\s+', ')'),
        (r'\s*([=+\-*/%<>!&|^~?:])\s*', r'\1'),
        (r',\s*', ','),
        (r'\b(if|for|while|switch|catch|with)\s+\(', r'\1('),
        (r'\b(function|return|var|let|const|new|delete|typeof|instanceof)\b\s*([A-Za-z0-9_$])', r'\1 \2'),
        (r'\}\s*else', '}else'), (r'\)\s*else', ')else'),
        (r';+}', '}'), (r';\s*$', '')
    ]
    for pat, repl in subs: s = re_sub(pat, repl, s)
    return s.strip()


def compress_css(src):
    s = _collapse_ws(_strip_comments(src))
    subs = [
        (r'\s*\{\s*', '{'), (r'\s*\}\s*', '}'),
        (r'\s*;\s*', ';'), (r'\s*:\s*', ':'), (r'\s*,\s*', ',')
    ]
    for pat, repl in subs: s = re_sub(pat, repl, s)
    return s.replace(';}', '}').strip()


def compress_html(src):
    return ''.join(
        line.strip() for line in
        re_split(r'\r\n|\r|\n', src)
    )


def process_files(pattern, compressor):
    for path in glob(pattern):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        compressed = compressor(content)
        with open(path, "w", encoding="utf-8") as f:
            f.write(compressed)



if __name__ == '__main__':
    process_files(path[0] + "/static/css/*.css", compress_css)
    process_files(path[0] + "/static/js/*.js", compress_js)
    process_files(path[0] + "/templates/*.html", compress_html)


