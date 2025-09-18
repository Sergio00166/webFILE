# Code by Sergio00166

from os.path import abspath, join
from re import compile as re_compile
from re import sub as re_sub
from re import S as re_S
from glob import glob
from sys import path

# ---------------------------
# Precompiled regex patterns
# ---------------------------

STRING_PAT = re_compile(r'(["\'`])(?:\\.|(?!\1).)*\1', re_S)
BLOCK_COMMENT_PAT = re_compile(r'/\*.*?\*/', re_S)
LINE_COMMENT_PAT = re_compile(r'//[^\r\n]*')
WS_COLLAPSE_PAT = re_compile(r'\s+')
JS_PUNCT_PAT = re_compile(r'\s*([{}\[\]()\.,:;])\s*')
JS_COMPARE_PAT = re_compile(r'\s*(===|!==|==|!=|<=|>=)\s*')
JS_LTGT_PAT = re_compile(r'\s*([<>])\s*')
JS_EQ_PAT = re_compile(r'\s*=\s*')
JS_OP_PAT = re_compile(r'\s*([+\-*/%&|^!~])\s*')
JS_FUNC_CALL_PAT = re_compile(r'([A-Za-z0-9_$])\s+\(')
JS_KEYWORD_CALL_PAT = re_compile(r'\b(if|for|while|switch|catch|with|function)\s+\(')
JS_ELSE_BLOCK_PAT = re_compile(r'\}\s*else\s*\{')
JS_ELSE_PAREN_PAT = re_compile(r'\)\s*else\s*\{')
JS_SEMI_CLOSE_PAT = re_compile(r';+}')
CSS_PUNCT_PAT = re_compile(r'\s*([{};:,>~])\s*')
TAG_WS_RE = re_compile(r'\s+(?=<)|(?<=>)\s+')

# ---------------------------
# comment stripper (strings/template aware)
# ---------------------------

def _strip_comments(src):
    strings = []
    def _store(m):
        strings.append(m.group(0))
        return f"__STR{len(strings)-1}__"
    src = STRING_PAT.sub(_store, src)
    src = BLOCK_COMMENT_PAT.sub(' ', src)
    src = LINE_COMMENT_PAT.sub(' ', src)
    for i, s in enumerate(strings):
        src = src.replace(f"__STR{i}__", s)
    return src

def _collapse_ws(s):
    return WS_COLLAPSE_PAT.sub(' ', s).strip()

# ---------------------------
# JS minifier
# ---------------------------

def compress_js(src):
    s = _strip_comments(src)
    s = _collapse_ws(s)
    s = JS_PUNCT_PAT.sub(r'\1', s)
    s = JS_COMPARE_PAT.sub(r'\1', s)
    s = JS_LTGT_PAT.sub(r'\1', s)
    s = JS_EQ_PAT.sub('=', s)
    s = JS_OP_PAT.sub(r'\1', s)
    s = JS_FUNC_CALL_PAT.sub(r'\1(', s)
    s = JS_KEYWORD_CALL_PAT.sub(r'\1(', s)
    s = JS_ELSE_BLOCK_PAT.sub(r'}else{', s)
    s = JS_ELSE_PAREN_PAT.sub(r')else{', s)
    s = JS_SEMI_CLOSE_PAT.sub(r'}', s)
    s = s.replace('; ', ';')
    return s.strip()

# ---------------------------
# CSS minifier
# ---------------------------

def compress_css(src):
    s = _strip_comments(src)
    s = _collapse_ws(s)
    s = CSS_PUNCT_PAT.sub(r'\1', s)
    s = s.replace(';}', '}')
    return s.strip()

# ---------------------------
# Simple HTML minifier (line strip + join)
# ---------------------------

def compress_html(src: str):
    collapsed = _collapse_ws(src)
    return TAG_WS_RE.sub('', collapsed)

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

# ---------------------------
# Main, run for all
# ---------------------------

if __name__ == '__main__':
    base = abspath(join(path[0], '..'))
    process_files(join(base, 'static', 'css', '*.css'), compress_css)
    process_files(join(base, 'static', 'js', '*.js'), compress_js)
    process_files(join(base, 'templates', '*'), compress_html)


 