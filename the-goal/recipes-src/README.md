# Recipe library source

One recipe per line, `|`-separated:

`name|category|cuisine|minutes|serves|kcal,protein,carbs,fat|tags|ingredients (;-separated)|steps (;-separated)`

- category: breakfast, starter, main, snack, dessert, drink
- tags (hand-set): veg, vgn, gf, df, mp (meal prep), trail
- hp (high protein), lc (low carb) and quick are computed from the numbers.

Rebuild after editing, from this folder:

    python3 build.py --write ../recipes.json

The build checks that calories match the macros and that vegetarian, vegan,
gluten-free and dairy-free labels agree with the ingredient list.
