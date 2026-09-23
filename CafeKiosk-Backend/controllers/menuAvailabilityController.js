// ============================================================
// MENU AVAILABILITY CONTROLLER
// ============================================================

const store =
    require(
        "../services/menuAvailabilityStore"
    );

exports.getAvailability =
    async (
        req,
        res,
        next
    ) => {
        try {
            const cafeId =
                store.normalizeCafeId(
                    req.query.cafeId
                );

            const items =
                await store
                    .getAvailability(
                        cafeId
                    );

            return res.json({
                success:
                    true,
                cafeId,
                count:
                    items.length,
                items
            });
        } catch (error) {
            next(error);
        }
    };

exports.putAvailability =
    async (
        req,
        res,
        next
    ) => {
        try {
            const cafeId =
                store.normalizeCafeId(
                    req.user?.cafeId || req.body?.cafeId
                );

            if (
                !Array.isArray(
                    req.body?.items
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,
                        message:
                            "items array is required."
                    });
            }

            const items =
                await store
                    .saveAvailability(
                        cafeId,
                        req.body.items
                    );

            const io =
                req.app.get(
                    "io"
                );

            if (io) {
                const payload = {
                    cafeId,
                    items,
                    changedAt:
                        new Date()
                            .toISOString()
                };

                io.to(
                    `pos-${cafeId}`
                ).emit(
                    "menu:availability-changed",
                    payload
                );

                io.to(
                    `kiosk-${cafeId}`
                ).emit(
                    "menu:availability-changed",
                    payload
                );
            }

            return res.json({
                success:
                    true,
                message:
                    "Menu availability saved.",
                cafeId,
                count:
                    items.length,
                items
            });
        } catch (error) {
            next(error);
        }
    };
