# The pinned runner for the architecture diagrams.
#
# The consolidated Structurizr tool ships as a single image. The `-playwright` variant
# is the one that carries the headless-Chromium renderer, which is the only exporter
# that honors a committed manual layout and produces the self-contained SVGs the
# guidebook embeds. The plain image cannot export PNG/SVG at all, so this is the tag
# the whole loop – local, export, validate, and inspect – runs on.
#
# Pinned exactly, and to a release well over three days old, as every dependency here
# is. Bump this one line to move the tool version; nothing else in the runner changes.
FROM structurizr/structurizr:2026.06.28-playwright
