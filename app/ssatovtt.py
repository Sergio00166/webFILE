# Original code by pmdevita
# Modified by Sergio00166

import re

def convert(source):
    ass = source.split("\n")
    sections, section = {}, []
    for i in ass:
        if not i:
            continue
        if i[0] == "[":
            if section:
                sections[key] = section
                section = []
            key = i[1:-1]
        else:
            section.append(i)
    if section:
        sections[key] = section

    info = {}
    for i in sections["Script Info"]:
        line = i.split(":")
        if len(line) > 1:
            info[line[0]] = line[1].strip()
        elif i.lstrip()[0] == ";":
            continue
        else:
            raise Exception("Unknown line in Script Info section: " + i)
    info["PlayResX"] = int(info["PlayResX"])
    info["PlayResY"] = int(info["PlayResY"])

    styles = {}
    FORMAT = "Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,TertiaryColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,AlphaLevel,Encoding".split(",")
    for line in sections["V4+ Styles"]:
        if line[:7] == "Format:":
            FORMAT = [i.strip() for i in line[7:].strip().split(",")]
        elif line[:6] == "Style:":
            style_list = line[6:].strip().split(",")
            style = {}
            for i, value in enumerate(style_list):
                style[FORMAT[i]] = value
            styles[style.pop("Name").replace(" ", "")] = style

    captions = []
    FORMAT = "Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text".split(",")
    format_length = len(FORMAT) - 1
    for line in sections["Events"]:
        if line[:7] == "Format:":
            FORMAT = [i.strip() for i in line[7:].strip().split(",")]
            format_length = len(FORMAT) - 1
        elif line[:9] == "Dialogue:":
            dialogue_list = line[6:].strip().split(",")
            dialogue = {}
            for i, value in enumerate(dialogue_list):
                if i > format_length:
                    dialogue["Text"] += "," + value
                    continue
                dialogue[FORMAT[i]] = value
            captions.append(dialogue)

    def rewrite_timestamp(timestamp):
        first_split = timestamp.split(".")
        hhmmss = first_split[0].split(":")
        ms = first_split[1]
        while len(ms) < 3:
            ms += "0"
        if len(hhmmss) == 3 and (hhmmss[0] == "0" or hhmmss[0] == "00"):
            hhmmss.pop(0)
        return ":".join(hhmmss) + "." + ms

    for style in styles:
        styles[style]["MarginR"] = int(styles[style]["MarginR"])
        styles[style]["MarginL"] = int(styles[style]["MarginL"])
        styles[style]["MarginV"] = int(styles[style]["MarginV"])

    for line in captions:
        line["Start"] = rewrite_timestamp(line["Start"])
        line["End"] = rewrite_timestamp(line["End"])
        text = line["Text"].replace("\\N", "\n")
        text = re.sub(r'\{\\p\d+.*?\\p0\}.*?\{\\p0\}', "", text, flags=re.DOTALL)  # eliminar dibujo
        text = re.sub(r'\{[^}]*\}', "", text)  # eliminar overrides, conservar texto
        line["Text"] = text

    seen, unique_captions = set(), []
    for cap in captions:
        key = (
            cap["Start"],
            cap["End"],
            cap.get("Text", "").strip(),
            cap.get("MarginL"),
            cap.get("MarginR"),
            cap.get("MarginV"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique_captions.append(cap)
    captions = unique_captions

    vtt = "WEBVTT\n\n"
    for style in styles:
        font = []
        if styles[style]["Bold"] == "-1":
            font.append("bold")
        if styles[style]["Italic"] == "-1":
            font.append("italic")
        if font:
            vtt += "STYLE\n." + style + " {font: " + " ".join(font) + ";}\n"
    vtt += "\n"

    for caption in captions:
        v_flag = False
        p_flag, name, style_str, text = "", "", "", ""
        position = {
            "left": int(caption["MarginL"]),
            "right": int(caption["MarginR"]),
            "bottom": int(caption["MarginV"]),
        }
        if not position["left"]:
            position["left"] = styles[caption["Style"]]["MarginL"]
        if not position["right"]:
            position["right"] = styles[caption["Style"]]["MarginR"]
        if not position["bottom"]:
            position["bottom"] = styles[caption["Style"]]["MarginV"]
        if position["bottom"]:
            p_flag += " line:-{}".format(
                round(position["bottom"] / info["PlayResY"] * 20, 4)
            )
        if position["left"] != position["right"]:
            p_flag += " position:{}%".format(
                round(
                    (position["left"] - position["right"]) / info["PlayResX"] * 100 + 50
                )
            )

        if "Name" in caption and caption["Name"]:
            v_flag = True
            name = " " + caption["Name"]
        if "Style" in caption and caption["Style"]:
            v_flag = True
            style_str = "." + caption["Style"]

        text = caption["Text"]
        if v_flag:
            text = "<v{style}{name}>{text}</v>".format(
                style=style_str, name=name, text=text
            )
        vtt_caption = "{Start} --> {End}{position}\n{Text}\n\n".format(
            Start=caption["Start"], End=caption["End"], Text=text, position=p_flag
        )
        vtt += vtt_caption

    return vtt
