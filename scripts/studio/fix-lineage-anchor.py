"""Fix one deliberately bounded source replacement, preserving unrelated loops."""
from pathlib import Path
path = Path('scripts/studio/lineage-refinement.py')
text = path.read_text()
old = "text = replace(text, 'for (let i = 0; i < 3; i++)', 'for (let i = 0; i < 8; i++)')"
new = "text = text.replace('for (let i = 0; i < 3; i++)', 'for (let i = 0; i < 8; i++)', 1)"
if old in text:
    assert text.count(old) == 1
    path.write_text(text.replace(old, new))
else:
    assert new in text, 'Lineage refinement anchor changed unexpectedly'
