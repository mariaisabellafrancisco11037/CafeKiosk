// ============================================================
// MENU AVAILABILITY STORE
// ============================================================

const fs =
    require("fs").promises;

const path =
    require("path");

const DATA_DIR =
    path.resolve(
        __dirname,
        "../data"
    );

const AVAILABILITY_FILE =
    path.join(
        DATA_DIR,
        "menu-availability.json"
    );

let writeQueue =
    Promise.resolve();

async function ensureStore() {
    await fs.mkdir(
        DATA_DIR,
        {
            recursive:
                true
        }
    );

    try {
        await fs.access(
            AVAILABILITY_FILE
        );
    } catch (_) {
        await fs.writeFile(
            AVAILABILITY_FILE,
            "{}\n",
            "utf8"
        );
    }
}

async function readStore() {
    await ensureStore();

    try {
        const text =
            await fs.readFile(
                AVAILABILITY_FILE,
                "utf8"
            );

        const parsed =
            text.trim()
                ? JSON.parse(text)
                : {};

        return (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        )
            ? parsed
            : {};
    } catch (error) {
        console.error(
            "❌ menu-availability.json is invalid:",
            error
        );
        return {};
    }
}

async function atomicWrite(data) {
    await ensureStore();

    const temporaryFile =
        `${AVAILABILITY_FILE}.tmp`;

    await fs.writeFile(
        temporaryFile,
        JSON.stringify(
            data,
            null,
            2
        ) +
        "\n",
        "utf8"
    );

    await fs.rename(
        temporaryFile,
        AVAILABILITY_FILE
    );
}

function queuedWrite(data) {
    writeQueue =
        writeQueue
            .catch(() => {})
            .then(
                () =>
                    atomicWrite(
                        data
                    )
            );

    return writeQueue;
}

function normalizeCafeId(value) {
    const normalized =
        String(
            value ||
            "cafe-1"
        ).trim();

    return normalized || "cafe-1";
}

function normalizeItems(items) {
    if (
        !Array.isArray(items)
    ) {
        return [];
    }

    const seen =
        new Set();

    return items
        .map(
            item => {
                const name =
                    String(
                        item?.name ||
                        ""
                    ).trim();

                const category =
                    String(
                        item?.category ||
                        ""
                    ).trim();

                if (
                    !name ||
                    !category
                ) {
                    return null;
                }

                const availability =
                    String(
                        item?.availability ||
                        "Available"
                    )
                        .trim()
                        .toLowerCase() ===
                        "unavailable"
                        ? "Unavailable"
                        : "Available";

                const key =
                    `${category.toLowerCase()}|${name.toLowerCase()}`;

                if (
                    seen.has(key)
                ) {
                    return null;
                }

                seen.add(key);

                return {
                    name,
                    category,
                    availability
                };
            }
        )
        .filter(Boolean)
        .slice(0, 2000);
}

async function getAvailability(cafeId) {
    const store =
        await readStore();

    const key =
        normalizeCafeId(
            cafeId
        );

    return Array.isArray(
        store[key]
    )
        ? store[key]
        : [];
}

async function saveAvailability(
    cafeId,
    items
) {
    const key =
        normalizeCafeId(
            cafeId
        );

    const normalized =
        normalizeItems(
            items
        );

    const store =
        await readStore();

    store[key] =
        normalized;

    await queuedWrite(
        store
    );

    return normalized;
}

module.exports = {
    AVAILABILITY_FILE,
    getAvailability,
    saveAvailability,
    normalizeCafeId,
    normalizeItems
};
