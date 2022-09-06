# autoButtons API script for Roll20

*IMPORTANT: This script requires tokenMod to apply damage & healing to tokens. I could recreate the functions for all that but.... surely the Venn diagram of "people installing API scripts" and "people without tokenMod" is just two distant, lonely circles?*

For documentation and support please visit Roll20:
### [autoButtons thread on Roll20](https://app.roll20.net/forum/permalink/10766392/)


## v0.6.0 TODO:

### Features
#### Account for temp_hp
- option 1: custom code, with a setting for the name of the temp_hp field
- option 2: Keith's solution, make register tempHP with tokenMod

#### Add HP change reporting
- toggle between GM, public, and character

#### Add settings menu

#### Add help menu

### Bugs
#### Fix bug with editButton()
- editButton() needs to check the styles key when the style is changed
