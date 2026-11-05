#!/usr/bin/env python3
"""Controlla i file del repo che gli agenti leggono: JSON, skill, plugin, marketplace e corsi.

Uso: python3 scripts/validate.py
Esce con codice 1 se trova almeno un errore. Richiede PyYAML (pip install pyyaml).
"""

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("Manca PyYAML: installalo con `pip install pyyaml` e rilancia.")

ROOT = Path(__file__).resolve().parent.parent
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
NAME_MAX = 64
DESCRIPTION_MAX = 1024
ALLOWED_HOSTS = {"fonts.googleapis.com", "fonts.gstatic.com"}
EXTERNAL_RE = re.compile(
    r"<(?:script|link|img|iframe|source|video|audio)\b[^>]*?\b(?:src|href)\s*=\s*[\"']((?:https?:)?//[^\"']+)"
    r"|@import\s+(?:url\()?[\"']?((?:https?:)?//[^\"')\s]+)",
    re.IGNORECASE,
)

errors: list[str] = []


def error(path: Path, message: str) -> None:
    errors.append(f"{path.relative_to(ROOT)}: {message}")


def tracked_files() -> list[Path]:
    skip = {".git", "node_modules"}
    return [p for p in ROOT.rglob("*") if p.is_file() and not skip & set(p.relative_to(ROOT).parts)]


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        error(path, f"JSON non valido alla riga {exc.lineno}, colonna {exc.colno}: {exc.msg}")
    return None


def check_name(path: Path, value, what: str) -> None:
    if not isinstance(value, str) or not value:
        error(path, f"{what}: `name` mancante o non è un testo")
    elif not NAME_RE.match(value):
        error(path, f"{what}: `name` «{value}» deve essere in kebab-case (minuscole, cifre, trattini)")
    elif len(value) > NAME_MAX:
        error(path, f"{what}: `name` ha {len(value)} caratteri, il massimo è {NAME_MAX}")


def check_skill(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.DOTALL)
    if not match:
        error(path, "manca il frontmatter YAML tra due righe `---`")
        return
    try:
        meta = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        first_line = str(exc).splitlines()[0]
        error(path, f"frontmatter YAML non valido ({first_line}); metti tra virgolette o in un blocco `>-` i valori con `: `")
        return
    if not isinstance(meta, dict):
        error(path, "il frontmatter non è una mappa chiave: valore")
        return
    name = meta.get("name")
    check_name(path, name, "skill")
    if isinstance(name, str) and name != path.parent.name:
        error(path, f"`name` «{name}» deve coincidere con il nome della cartella «{path.parent.name}»")
    description = meta.get("description")
    if not isinstance(description, str) or not description.strip():
        error(path, "`description` mancante o non è un testo")
    elif len(description) > DESCRIPTION_MAX:
        error(path, f"`description` ha {len(description)} caratteri, il massimo è {DESCRIPTION_MAX}")
    hint = meta.get("argument-hint")
    if hint is not None and not isinstance(hint, str):
        error(path, "`argument-hint` deve essere un testo: mettilo tra virgolette se inizia con `[`")
    tools = meta.get("allowed-tools")
    if tools is not None and not isinstance(tools, (str, list)):
        error(path, "`allowed-tools` deve essere un testo o una lista")
    for key in ("disable-model-invocation", "user-invocable"):
        if key in meta and not isinstance(meta[key], bool):
            error(path, f"`{key}` deve essere true o false")


def check_plugin(path: Path) -> None:
    data = load_json(path)
    if not isinstance(data, dict):
        return
    check_name(path, data.get("name"), "plugin")
    if not isinstance(data.get("version"), str):
        error(path, "manca `version`: serve per distribuire gli aggiornamenti")
    plugin_root = path.parent.parent
    if not (plugin_root / "skills").is_dir() and not (plugin_root / "agents").is_dir():
        error(path, "il plugin non ha né `skills/` né `agents/` accanto a `.claude-plugin/`")
    for misplaced in ("skills", "agents", "hooks"):
        if (path.parent / misplaced).exists():
            error(path, f"`{misplaced}/` va alla radice del plugin, non dentro `.claude-plugin/`")


def check_marketplace(path: Path) -> None:
    data = load_json(path)
    if not isinstance(data, dict):
        return
    check_name(path, data.get("name"), "marketplace")
    owner = data.get("owner")
    if not isinstance(owner, dict) or not owner.get("name"):
        error(path, "manca `owner.name`")
    plugins = data.get("plugins")
    if not isinstance(plugins, list) or not plugins:
        error(path, "`plugins` deve essere una lista non vuota")
        return
    market_root = path.parent.parent
    for index, entry in enumerate(plugins):
        label = f"plugins[{index}]"
        if not isinstance(entry, dict):
            error(path, f"{label} non è un oggetto")
            continue
        check_name(path, entry.get("name"), label)
        source = entry.get("source")
        if not isinstance(source, str):
            continue  # sorgenti remote (github, url, …): non verificabili da qui
        if ".." in Path(source).parts:
            error(path, f"{label}: `source` non può contenere `..`")
            continue
        plugin_dir = (market_root / source).resolve()
        manifest = plugin_dir / ".claude-plugin" / "plugin.json"
        if not manifest.is_file():
            error(path, f"{label}: `source` «{source}» non porta a un plugin con `.claude-plugin/plugin.json`")
            continue
        plugin = load_json(manifest)
        if isinstance(plugin, dict) and plugin.get("name") != entry.get("name"):
            error(path, f"{label}: `name` «{entry.get('name')}» diverso da quello in {manifest.relative_to(ROOT)} («{plugin.get('name')}»)")
    copy = market_root / ".github" / "plugin" / "marketplace.json"
    if copy.is_file() and load_json(copy) != data:
        error(copy, "la copia per Copilot è diversa da .claude-plugin/marketplace.json")


def check_course(course: Path) -> None:
    for part in ("presentazione/index.html", "scaletta.md", "lab"):
        if not (course / part).exists():
            error(course, f"manca `{part}`: ogni corso ha presentazione, scaletta e lab (ADR-0001)")
    if not re.match(r"^\d{2}-[a-z0-9]+(-[a-z0-9]+)*$", course.name):
        error(course, "il nome della cartella deve essere `NN-slug`")
    html = course / "presentazione" / "index.html"
    if html.is_file():
        for match in EXTERNAL_RE.finditer(html.read_text(encoding="utf-8")):
            url = match.group(1) or match.group(2)
            host = re.sub(r"^(?:https?:)?//", "", url).split("/")[0]
            if host not in ALLOWED_HOSTS:
                error(html, f"risorsa esterna non ammessa: {url} (sono ammessi solo i font di Google Fonts)")


def main() -> int:
    files = tracked_files()
    for path in files:
        if path.suffix == ".json":
            if path.name == "plugin.json" and path.parent.name == ".claude-plugin":
                check_plugin(path)
            elif path.name == "marketplace.json" and path.parent.name == ".claude-plugin":
                check_marketplace(path)
            else:
                load_json(path)
        elif path.name == "SKILL.md":
            check_skill(path)
    courses = ROOT / "corsi"
    if courses.is_dir():
        for course in sorted(p for p in courses.iterdir() if p.is_dir()):
            check_course(course)

    skills = sum(1 for p in files if p.name == "SKILL.md")
    jsons = sum(1 for p in files if p.suffix == ".json")
    if errors:
        print(f"✗ {len(errors)} errori:")
        for line in errors:
            print(f"  - {line}")
        return 1
    print(f"✓ Tutto in ordine: {jsons} file JSON, {skills} skill.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
