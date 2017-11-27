ASE_SPRITES=$(wildcard content/sprites/*.ase)
ASE_TEXTURES=$(wildcard content/textures/*.ase)
ASE_DIM=512
ASE_OUTPUT_SHEET="www/sheet.png"
ASE_OUTPUT_META="content/sheet.json"

all: $(ASE_OUTPUT_SHEET)

clean:
	$(RM) $(ASE_OUTPUT_SHEET) $(ASE_OUTPUT_META)

$(ASE_OUTPUT_SHEET): $(ASE_SPRITES) $(ASE_TEXTURES)
	aseprite -b \
		--sheet-width $(ASE_DIM) --sheet-height $(ASE_DIM) \
		$(ASE_TEXTURES) $(ASE_SPRITES) \
		--sheet-pack --sheet $(ASE_OUTPUT_SHEET) \
		--list-tags > $(ASE_OUTPUT_META)
