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
PLACEHOLDER_PATTERN = re_compile(r'__STR_REPL_(\d+)__')


# ---------------------------
# string + comment handling
# ---------------------------

def extract_strings(src, strings):
    idx = len(strings)
    strings.append(src)
    return f"__STR_REPL_{idx}__"

def strip_comments(src):
    strings = []
    src = STRING_PAT.sub(lambda m: extract_strings(m.group(0), strings), src)
    src = BLOCK_COMMENT_PAT.sub(' ', src)
    src = LINE_COMMENT_PAT.sub(' ', src)
    return src, strings

def restore_strings(src, strings):
    return PLACEHOLDER_PATTERN.sub(lambda m: strings[int(m.group(1))], src)

def collapse_ws(s):
    return WS_COLLAPSE_PAT.sub(' ', s).strip()


# ---------------------------
# JS minifier
# ---------------------------

def compress_js(src):
    s, strings = strip_comments(src)
    s = collapse_ws(s)
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
    s = restore_strings(s, strings)
    return s.strip()


# ---------------------------
# CSS minifier
# ---------------------------

def compress_css(src):
    s, strings = strip_comments(src)
    s = collapse_ws(s)
    s = CSS_PUNCT_PAT.sub(r'\1', s)
    s = s.replace(';}', '}')
    s = restore_strings(s, strings)
    return s.strip()


# ---------------------------
# Simple HTML minifier (line strip + join)
# ---------------------------

def compress_html(src):
    s, strings = strip_comments(src)
    s = collapse_ws(s)
    s = TAG_WS_RE.sub('', s)
    s = restore_strings(s, strings)
    return s


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
    process_files(join(base, 'static', 'js', 'photo.js'), compress_js)
    process_files(join(base, 'static', 'js', 'login.js'), compress_js)
    process_files(join(base, 'static', 'js', 'video', '*.js'), compress_js)
    process_files(join(base, 'static', 'js', 'index', '*.js'), compress_js)
    process_files(join(base, 'static', 'js', 'audio', '*.js'), compress_js)
    process_files(join(base, 'templates', '*'), compress_html)


 