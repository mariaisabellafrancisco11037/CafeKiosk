// ============================================================
// CAFEKIOSK - SAMPLE STOCK + 180 MENU RECIPE SEEDER
// ============================================================
//
// Run from CafeKiosk-Backend:
//     node seed-sample-menu-recipes.js
//
// Safe behavior:
// - adds missing sample stock
// - adds sample recipes for the existing 180 menu items
// - does NOT overwrite ingredient stock that already exists
// - does NOT overwrite recipes that already contain ingredients
// ============================================================

const store =
    require(
        "./services/recipeInventoryStore"
    );


(async () => {

    const cafeId =
        process.argv[2] ||
        "cafe-1";


    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "☕ CafeKiosk Sample Recipe Seeder"
    );
    console.log(
        `Cafe: ${cafeId}`
    );
    console.log(
        "=============================================="
    );


    const result =
        await store
            .seedSampleIngredients(
                cafeId
            );


    console.log(
        `Ingredients added: ${result.addedCount}`
    );

    console.log(
        `Total ingredients: ${result.totalIngredients}`
    );

    console.log(
        `Menu recipes added: ${result.recipeAddedCount}`
    );

    console.log(
        `Empty recipes repaired: ${result.recipeRepairedCount}`
    );

    console.log(
        `Existing recipes preserved: ${result.recipeSkippedCount}`
    );

    console.log(
        `Total recipes now: ${result.totalRecipes}`
    );


    if (
        result.recipeErrorCount
    ) {

        console.log("");
        console.log(
            `⚠ Recipe errors: ${result.recipeErrorCount}`
        );

        console.table(
            result.recipeErrors
        );
    }


    console.log("");
    console.log(
        result.recipeErrorCount === 0
            ? "✅ Sample stock and menu recipes are ready."
            : "⚠ Completed with recipe errors."
    );

    console.log(
        "=============================================="
    );
    console.log("");

})()
.catch(
    error => {

        console.error(
            "❌ Seeder failed:",
            error
        );

        process.exitCode =
            1;
    }
);
