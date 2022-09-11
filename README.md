# autoButtons API script for Roll20

*IMPORTANT: This script requires tokenMod to apply damage & healing to tokens. I could recreate the functions for all that but.... surely the Venn diagram of "people installing API scripts" and "people without tokenMod" is just two distant, lonely circles?*

For documentation and support please visit Roll20:
### [autoButtons thread on Roll20](https://app.roll20.net/forum/permalink/10766392/)


## v0.6.0:

### Bugfixes:
- Buttons were not being removed cleanly when deleted while active
- Potential sandbox crash when buttons had corrupted math functions
- Remove templates command wasn't working properly
- Inbuilt styles could not be applied via editButton


### Changes:
- Restructured internal settings and store. Hopefully didn't break too much stuff.

### Features:
- Settings menu is in
- Reworked templates & properties menu options
- Help is very slightly less unhelpful than before. It now has a link to this thread.

### Not fixed:
- temp_hp: use Aaron script instead, with modification
