# autoButtons
autoButtons API script for Roll20

IMPORTANT: This script requires tokenMod to apply damage & healing to tokens. I could recreate the functions for all that but.... surely the Venn diagram of "people installing API scripts" and "people without tokenMod" is just two distant, lonely circles?

## [autoButtons thread](https://app.roll20.net/forum/permalink/10766392/)


# CLI Commands
** Keyword: ** !autoButton


** --listButtons / --buttons    
    Generates a list of buttons currently available for use, e.g:

```!autoButton --buttons```

![buttonList](https://s3.amazonaws.com/files.d20.io/images/276859251/9IWq8YEggyYvcZpbTyI6wA/original.gif?1647946775)

From left to right, the controls are "Show button", "Hide button", "Delete 
button". Controls are greyed out when nonsensical - you can't "Show" a 
button which is already shown on the button template, and you cannot 
"Hide" a button which isn't currently enabled.

Buttons marked with an asterisk are default buttons - these cannot be deleted.

--showButton <button name>

   
 The same as clicking the "Show" button on the button list: this adds 
the button to the template spat out by the script after each damage 
roll. You'll probably want to do this after creating a new button, 
otherwise you can't click it. What good is a button that can't be 
clicked? And what of the mental state of a button that isn't getting 
clicked?

--hideButton <button name>
   
 Same as the "Hide" button in the list. Removes the button from the 
button template, but leaves it in the button pool if you want to add it 
back in later.

--deleteButton <button name>

    Delete a button entirely. This will also remove it from the button template. Default buttons cannot be deleted.

--createButton <button data>

   
 Creates a new button to add to the pool. There's a button on the button
 list which will do this for you via prompts, but if you'd rather enter 
it in straight through the CLI, the required fields just need to be 
entered in moustache/handlebars format, like a roll template macro. The 
keys are:

    name: the name of the button. Used by 
the script and other settings, not displayed. First character must be a 
letter, stick to alpha-numeric unless you know what you're doing (this 
becomes a JS object key). If you have spaces in the name, it will be 
camelCased for you - you'll need to use the camelCase version in future 
to refer to the button.

    sheets: array of sheets 
which the button is designed for. Not currently very useful, just leave 
blank for now, this signifies 'all sheets'.

    tooltip: the tooltip displayed on mouseover of the button. % is a control character here, and will be replaced with the calculated value from the button's math function.

    content: the label on the button. The default buttons all use the pictos font and one or two characters. If you want to use a normal character, you'll need to edit the style as well

    style: the inline CSS styles to use for the button label. You can supply a pre-built style from the script by key name (in the styles object around line 140) or a string containing your own CSS

    math: the tricky bit. This is still pretty basic, but you can use:

        basic math operators & parenthesis: ( ) + - / * 

        round down, round up, round nearest: floor, ceil, round

        references to the two objects passed in from the inline roll functions, and their child keys: damage and crit

        if you know your JS Math library, you can use those functions directly as well

    For the button to create successfully, the math function must compile successfully into a JS function, and a test run using integers must return a number. If these conditions aren't met the button will be rejected with a message. Negative values will inflict damage, positive values will cause healing.

    The two inline roll objects, damage and crit, will contain a key for total, along with a key for each property listed under that category. See the output from !autobut --props for clarity if required, but the standard 5e preset would contain these keys:

    damage.dmg1

    damage.dmg2

    damage.globaldamage

    damage.total


Example: we'll create a button which does half crit damage, rounded down:

!autobut --createbut {{name=half crit}} {{content=k}} {{tooltip=Half Crit (%)}} {{style=crit}} {{math=floor(crit.total/2)}}

We
 won't bother with {{sheets=...}} here. Note that I've been naughty and 
left a space in the button name. The script will fix that for us.

So,
 I've pinched the style from the normal crit button, but only used a 
single heart in {{content}}. The button is now in the pool, but not added to the template. So we need to make it visible next, either through the --buttons menu, or directly via CLI:

!autobut --showbut halfCrit

Note
 the halfCrit name - this was automatically camelCased for us, since 
whitespace is naughty for the way the buttons are stored.

Now, next time a damage roll is picked up, our new button appears on the end:

    

But....
 RUH ROH! I've clicked the button and the pesky red lady is still on 
11/11 HP. I've forgotten the negative sign in the math function, what a 
dunce! That brings us rather neatly to the editButton function! And that was a genuine fuck-up, I didn't even need to rehearse it!

--editButton <button data>

    This function is almost the same as the createButton function, with a couple of differences: {{name=}} must
 match (exactly) an existing button name, and all other keys are 
optional. If you only want to edit one property, you only need to enter 
that.

Example: to fix my mistake above, I would just need to supply the CLI with:

!autobut --editbut {{name=halfCrit}} {{math=-floor(crit.total/2)}}

I've
 fixed up the camelised name, and just added the minus sign to the start
 of the math function. The result was a resounding success for us, and 
an unfortunate bed-shitting for the red lady, since my new roll was 
enough to knock her out of the competition:

    

IMPORTANT NOTE:
 All changes made by the script (like editing a button in the example 
above) are only applied to buttons generated afterwards. Once they're 
posted in chat, the buttons are static and will not be affected by any 
future script changes.

--reorderButtons / --order

    Reorder the buttons, left to right, with a comma-delimited list. The buttons are indexed from 1, left to right in their current order. So
 in the screenshot above with the halfCrit button, we have buttons 1 to 5
 from left to right. If we want the half crit button in the second 
position (between the full crit and normal damage), we'd supply this:

!autobut --order 1,5,2,3,4

(actually,
 we could just supply "1,5" as the order - any unlisted indices will be 
left in the current order and thrown on the end).



--listTemplates / --templates

    List the roll template names the script listens for in chat

--addTemplate <template name>

    Add a roll template name to the listener list

--removeTemplate <template name>

    Remove a template name from the listener list


--listProperties / --props

    List the roll template properties the listener tries to grab inline rolls from:

        

--addProperty <prop category/prop name>

    Add a roll template property to monitor for inline rolls.

    IMPORTANT: properties must belong to a category, and cannot be added without one. If using the 5e sheet, all 4 categories above can be used, though the upcast ones are ignored if the damage didn't come from a spell. For custom sheets, only the damage and crit categories send data through to the button math functions, so you will want to use one of those.

   
 For example, the screenshot above has a customDmg3 property added 
(doesn't exist on the 5e sheet and won't actually do anything 
obviously). To add that property, we'd type some letters thusly (with 
some shortcut commands!):

!autobut --addprop damage/customDmg3

In short: any property added or removed must
 contain a forward slash '/' to denote the category and property. Any 
further slashes are no use - there's no nesting of properties.

--removeProperty <prop category/prop name>

    Remove a roll template property from the inline roll monitor. Subject to all the same conditions as --addProperty above.


--hpBar / --bar < 1 | 2 | 3 >

    Set the token bar to affect with HP changes. Default is 1.

--loadPreset <preset sheet name>

   
 Load the preset settings for a game system. Currently doesn't do a 
great deal since only 5e has settings coded in, though you can switch to
 'custom' if you want a blank slate. Note that this will clear all 
settings, including the template listener array. The script won't do anything until you've added some templates & properties to listen for.

--reset
    Reload the current preset. Might be handy if something goes horribly wrong.


 --uninstall

    Remove all autoButton data from the [state] object. Restarting the sandbox will initiate a clean install of autoButtons.

--help

    Really not very useful.

--settings

    Even less useful than --help.

Toggles: these settings can be toggled by supplying no argument, turned on by supplying on, 1, or true or turned off with off, 0, or false.

--overkill

    Allow HP to drop below 0. Default is off.

--overheal

    Allow HP to exceed max. Default is off.

--ignoreAPI

    Ignore any rolltemplates generated by the API. Default is on.

--gmOnly

    Button template is whispered to the GM. Default is on. Worth noting that the script only applies damage to selected
 tokens, so there's generally no real risk in allowing players to use 
it, though the buttons will post publicly if this setting is toggled 
off, and some people don't like that chat spam.

    This does not allow players to use the CLI to change script settings - it merely posts the buttons to public chat so they can go click-crazy.


Updates

v0.4.4:

    - fixed math functions not saving properly on buttons. The state object does not like storing functions!

    - fixed NaN error in spells

    - fixed bad reference to higher level casting fields, causing damage to not be added

