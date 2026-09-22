// ============================================================
// CAFEKIOSK AUDIT LOG MIDDLEWARE
//
// Records meaningful state-changing activity across:
// - Admin
// - Staff / POS
// - Kiosk
// - Orders
// - Inventory
// - Menu
// - Promotions
// - Users
// - Settings
//
// Normal GET polling is intentionally NOT logged to avoid flooding
// the audit trail with refresh traffic.
// ============================================================

const {
  decodeRequestUser
} = require("./authMiddleware");

const {
  addAuditLog
} = require("../services/auditLogStore");

function text(value) {
  return String(value ?? "").trim();
}

function body(req) {
  return req?.body && typeof req.body === "object"
    ? req.body
    : {};
}

function upperMethod(req) {
  return text(req?.method || "GET").toUpperCase();
}

function requestPath(req) {
  return text(req?.originalUrl || req?.url || req?.path || "");
}

function lowerPath(req) {
  return requestPath(req).toLowerCase();
}

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      text(value) !== ""
    ) {
      return value;
    }
  }

  return "";
}

function refererPath(req) {
  const raw = text(
    req?.headers?.referer ||
    req?.headers?.referrer ||
    ""
  );

  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).pathname.toLowerCase();
  } catch (_) {
    return raw.toLowerCase();
  }
}

function normalizeSource(value) {
  const source = text(value).toLowerCase();

  if (source.includes("kiosk")) return "Kiosk";

  if (
    source.includes("pos") ||
    source.includes("order queue") ||
    source.includes("order-queue")
  ) {
    return "POS";
  }

  if (source.includes("admin")) return "Admin";
  if (source.includes("staff")) return "POS";
  if (source.includes("system")) return "System";

  return text(value);
}

function inferSource(req, user) {
  const b = body(req);

  // 1. Explicit source supplied by POS/Kiosk order payload.
  const explicit = normalizeSource(
    firstValue(
      b.source,
      b.channel,
      b.orderSource,
      b.clientSource
    )
  );

  if (explicit) {
    return explicit;
  }

  // 2. Referrer tells us which actual UI initiated the API request.
  const ref = refererPath(req);

  if (ref.includes("/kiosk/")) return "Kiosk";

  if (
    ref.includes("/pos/") ||
    ref.includes("order-queue")
  ) {
    return "POS";
  }

  if (ref.includes("/admin/")) return "Admin";

  // 3. Authenticated role fallback.
  const role = text(user?.role).toLowerCase();

  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "staff") return "POS";

  // 4. API path fallback.
  const path = lowerPath(req);

  if (path.includes("/kiosk")) return "Kiosk";
  if (path.includes("/pos")) return "POS";

  return "System";
}

function inferCafeId(req, user) {
  return (
    text(
      firstValue(
        user?.cafeId,
        body(req).cafeId,
        req?.query?.cafeId,
        "cafe-1"
      )
    ) ||
    "cafe-1"
  );
}

function inferRequestUser(req) {
  try {
    const decoded = decodeRequestUser(req);

    if (decoded) {
      const role = text(
        firstValue(
          decoded.role,
          "User"
        )
      );

      return {
        userId: text(
          firstValue(
            decoded.userId,
            decoded.id,
            decoded.username
          )
        ),

        user: text(
          firstValue(
            decoded.displayName,
            decoded.username,
            decoded.userId,
            role
          )
        ),

        role,

        cafeId: text(
          firstValue(
            decoded.cafeId,
            body(req).cafeId,
            req?.query?.cafeId,
            "cafe-1"
          )
        )
      };
    }
  } catch (_) {}

  const path = lowerPath(req);
  const b = body(req);

  // Login has no token yet.
  if (
    path.includes("/api/auth") &&
    path.includes("login")
  ) {
    let role = text(
      firstValue(
        b.role,
        path.includes("admin")
          ? "Admin"
          : path.includes("staff")
            ? "Staff"
            : "User"
      )
    );

    const username = text(
      firstValue(
        b.username,
        b.userId,
        b.email,
        role
      )
    );

    return {
      userId: username,
      user: username || role,
      role,
      cafeId: text(
        firstValue(
          b.cafeId,
          "cafe-1"
        )
      )
    };
  }

  const source = normalizeSource(
    firstValue(
      b.source,
      b.channel,
      b.orderSource
    )
  );

  if (source === "Kiosk") {
    return {
      userId: "",
      user: "Kiosk",
      role: "Kiosk",
      cafeId: text(
        firstValue(
          b.cafeId,
          req?.query?.cafeId,
          "cafe-1"
        )
      )
    };
  }

  if (source === "POS") {
    return {
      userId: "",
      user: "POS",
      role: "POS",
      cafeId: text(
        firstValue(
          b.cafeId,
          req?.query?.cafeId,
          "cafe-1"
        )
      )
    };
  }

  return {
    userId: "",
    user: "System",
    role: "System",
    cafeId: text(
      firstValue(
        b.cafeId,
        req?.query?.cafeId,
        "cafe-1"
      )
    )
  };
}

function pathId(req) {
  const pathname =
    requestPath(req).split("?")[0];

  const parts =
    pathname
      .split("/")
      .filter(Boolean);

  try {
    return decodeURIComponent(
      parts[
        parts.length - 1
      ] || ""
    );
  } catch (_) {
    return parts[
      parts.length - 1
    ] || "";
  }
}

function orderIdentifier(req) {
  const b = body(req);

  const value = text(
    firstValue(
      b.orderNumber,
      b.orderId,
      b.id,
      req?.params?.orderId,
      req?.params?.id,
      pathId(req)
    )
  );

  if (
    !value ||
    [
      "orders",
      "status",
      "refund",
      "void"
    ].includes(
      value.toLowerCase()
    )
  ) {
    return "";
  }

  return value;
}

function itemIdentifier(req) {
  const b = body(req);

  return text(
    firstValue(
      b.name,
      b.itemName,
      b.productName,
      b.ingredientName,
      b.title,
      b.id,
      req?.params?.id,
      pathId(req)
    )
  );
}

function orderDetails(req, label) {
  const b = body(req);
  const parts = [label];

  const source = normalizeSource(
    firstValue(
      b.source,
      b.channel
    )
  );

  if (source) {
    parts.push(`Source ${source}`);
  }

  const serviceType = text(
    firstValue(
      b.serviceType,
      b.orderType
    )
  );

  if (serviceType) {
    parts.push(serviceType);
  }

  const payment = text(
    firstValue(
      b.paymentMethod,
      b.paymentType
    )
  );

  if (payment) {
    parts.push(`Payment ${payment}`);
  }

  const items =
    Array.isArray(b.items)
      ? b.items
      : Array.isArray(b.orderItems)
        ? b.orderItems
        : [];

  if (items.length) {
    const count =
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            1,
            Number(
              item?.qty ??
              item?.quantity ??
              1
            ) || 1
          ),
        0
      );

    parts.push(`${count} item${count === 1 ? "" : "s"}`);
  }

  const total = Number(b.total);

  if (Number.isFinite(total)) {
    parts.push(
      `Total ₱${total.toFixed(2)}`
    );
  }

  return parts.join(" · ");
}

function classifyRequest(req) {
  const method =
    upperMethod(req);

  const path =
    lowerPath(req);

  const b =
    body(req);

  // Never audit the audit viewer itself.
  if (
    path.includes(
      "/api/audit-logs"
    )
  ) {
    return null;
  }

  // Do not record background reads/polling.
  if (
    [
      "GET",
      "HEAD",
      "OPTIONS"
    ].includes(method)
  ) {
    return null;
  }

  // ---------------- AUTH ----------------
  if (
    path.includes("/api/auth") &&
    path.includes("login")
  ) {
    return {
      action: "Login",
      details:
        "User attempted to log in",
      category:
        "Authentication"
    };
  }

  if (
    path.includes("/api/auth") &&
    path.includes("logout")
  ) {
    return {
      action: "Logout",
      details:
        "User logged out",
      category:
        "Authentication"
    };
  }

  if (
    path.includes("/api/auth") &&
    (
      path.includes("password") ||
      path.includes("credential")
    )
  ) {
    return {
      action:
        "Password Change",
      details:
        "Account credentials were changed",
      category:
        "Authentication"
    };
  }

  // ---------------- ORDERS ----------------
  if (
    path.startsWith(
      "/api/orders"
    )
  ) {
    const id =
      orderIdentifier(req);

    const label =
      id
        ? `Order ${id}`
        : "Order";

    const requestedStatus =
      text(
        firstValue(
          b.status,
          b.orderStatus
        )
      ).toUpperCase();

    if (
      path.includes("refund") ||
      requestedStatus.includes(
        "REFUND"
      )
    ) {
      return {
        action:
          "Order Refunded",
        details:
          `${label} was refunded`,
        category:
          "Orders",
        entityId: id
      };
    }

    if (
      path.includes("void") ||
      requestedStatus.includes(
        "VOID"
      )
    ) {
      return {
        action:
          "Order Voided",
        details:
          `${label} was voided`,
        category:
          "Orders",
        entityId: id
      };
    }

    if (
      requestedStatus.includes(
        "CANCEL"
      )
    ) {
      return {
        action:
          "Order Cancelled",
        details:
          `${label} was cancelled`,
        category:
          "Orders",
        entityId: id
      };
    }

    if (
      method === "POST"
    ) {
      return {
        action:
          "Order Created",
        details:
          orderDetails(
            req,
            `${label} created`
          ),
        category:
          "Orders",
        entityId: id
      };
    }

    if (
      method === "DELETE"
    ) {
      return {
        action:
          "Order Deleted",
        details:
          `${label} was deleted`,
        category:
          "Orders",
        entityId: id
      };
    }

    if (
      [
        "PATCH",
        "PUT"
      ].includes(method)
    ) {
      if (
        requestedStatus
      ) {
        return {
          action:
            "Order Status Updated",
          details:
            `${label} status changed to ${requestedStatus}`,
          category:
            "Orders",
          entityId: id
        };
      }

      const payment =
        text(
          firstValue(
            b.paymentMethod,
            b.paymentStatus
          )
        );

      if (payment) {
        return {
          action:
            "Order Payment Updated",
          details:
            `${label} payment updated to ${payment}`,
          category:
            "Orders",
          entityId: id
        };
      }

      return {
        action:
          "Order Updated",
        details:
          `${label} was updated`,
        category:
          "Orders",
        entityId: id
      };
    }
  }

  // ---------------- INVENTORY ----------------
  if (
    path.startsWith(
      "/api/inventory"
    )
  ) {
    const item =
      itemIdentifier(req);

    const itemText =
      item
        ? ` ${item}`
        : "";

    if (
      method === "POST" &&
      !path.includes("adjust") &&
      !path.includes("stock")
    ) {
      return {
        action:
          "Inventory Item Added",
        details:
          `Inventory item${itemText} was added`,
        category:
          "Inventory",
        entityId: item
      };
    }

    if (
      method === "DELETE"
    ) {
      return {
        action:
          "Inventory Item Deleted",
        details:
          `Inventory item${itemText} was deleted`,
        category:
          "Inventory",
        entityId: item
      };
    }

    const amount =
      firstValue(
        b.stock,
        b.quantity,
        b.amount,
        b.delta,
        b.adjustment
      );

    return {
      action:
        path.includes("adjust") ||
        path.includes("stock")
          ? "Inventory Stock Adjusted"
          : "Inventory Updated",

      details:
        `Inventory${itemText} was updated` +
        (
          text(amount)
            ? ` · Value ${text(amount)}`
            : ""
        ),

      category:
        "Inventory",

      entityId: item
    };
  }

  // ---------------- MENU ----------------
  if (
    path.startsWith(
      "/api/menu-availability"
    ) ||
    path.startsWith(
      "/api/products"
    ) ||
    path.startsWith(
      "/api/menu"
    )
  ) {
    const item =
      itemIdentifier(req);

    const itemText =
      item
        ? ` ${item}`
        : "";

    if (
      path.startsWith(
        "/api/menu-availability"
      )
    ) {
      const availability =
        firstValue(
          b.available,
          b.isAvailable,
          b.availability,
          b.status
        );

      return {
        action:
          "Menu Availability Updated",

        details:
          `Menu availability${itemText} was changed` +
          (
            text(availability)
              ? ` · ${text(availability)}`
              : ""
          ),

        category:
          "Menu",

        entityId:
          item
      };
    }

    if (
      method === "POST"
    ) {
      return {
        action:
          "Menu Item Added",
        details:
          `Menu item${itemText} was added`,
        category:
          "Menu",
        entityId:
          item
      };
    }

    if (
      method === "DELETE"
    ) {
      return {
        action:
          "Menu Item Deleted",
        details:
          `Menu item${itemText} was deleted`,
        category:
          "Menu",
        entityId:
          item
      };
    }

    return {
      action:
        "Menu Item Updated",
      details:
        `Menu item${itemText} was updated`,
      category:
        "Menu",
      entityId:
        item
    };
  }

  // ---------------- PROMOTIONS ----------------
  if (
    path.includes("promotion") ||
    path.includes("discount")
  ) {
    const item =
      itemIdentifier(req);

    const suffix =
      item
        ? ` ${item}`
        : "";

    if (
      method === "POST"
    ) {
      return {
        action:
          "Promotion Added",
        details:
          `Promotion${suffix} was added`,
        category:
          "Promotions",
        entityId:
          item
      };
    }

    if (
      method === "DELETE"
    ) {
      return {
        action:
          "Promotion Deleted",
        details:
          `Promotion${suffix} was deleted`,
        category:
          "Promotions",
        entityId:
          item
      };
    }

    return {
      action:
        "Promotion Updated",
      details:
        `Promotion${suffix} was updated`,
      category:
        "Promotions",
      entityId:
        item
    };
  }

  // ---------------- USERS ----------------
  if (
    path.includes("/users") ||
    path.includes(
      "/user-management"
    )
  ) {
    const item =
      itemIdentifier(req);

    const suffix =
      item
        ? ` ${item}`
        : "";

    if (
      method === "POST"
    ) {
      return {
        action:
          "User Added",
        details:
          `User${suffix} was added`,
        category:
          "Users",
        entityId:
          item
      };
    }

    if (
      method === "DELETE"
    ) {
      return {
        action:
          "User Deleted",
        details:
          `User${suffix} was deleted`,
        category:
          "Users",
        entityId:
          item
      };
    }

    return {
      action:
        "User Updated",
      details:
        `User${suffix} was updated`,
      category:
        "Users",
      entityId:
        item
    };
  }

  // ---------------- SETTINGS ----------------
  if (
    path.includes(
      "/settings"
    )
  ) {
    return {
      action:
        "Settings Updated",
      details:
        "System settings were updated",
      category:
        "Settings"
    };
  }

  // Any other state-changing API request still appears.
  return {
    action:
      "System Update",
    details:
      `${method} ${requestPath(req)}`,
    category:
      "System"
  };
}

function auditLogMiddleware(
  req,
  res,
  next
) {
  const classification =
    classifyRequest(req);

  if (!classification) {
    return next();
  }

  const startedAt =
    Date.now();

  res.on(
    "finish",
    () => {
      try {
        const user =
          inferRequestUser(req);

        const success =
          res.statusCode < 400;

        let action =
          classification.action;

        let details =
          classification.details;

        if (
          !success &&
          classification.action ===
            "Login"
        ) {
          action =
            "Login Failed";

          details =
            `Login failed with HTTP ${res.statusCode}`;
        } else if (
          !success
        ) {
          action =
            `${classification.action} Failed`;

          details =
            `${classification.details} · HTTP ${res.statusCode}`;
        }

        addAuditLog({
          cafeId:
            inferCafeId(
              req,
              user
            ),

          user:
            user.user,

          userId:
            user.userId,

          role:
            user.role,

          action,

          category:
            classification.category,

          details,

          entityId:
            classification.entityId ||
            "",

          source:
            inferSource(
              req,
              user
            ),

          method:
            upperMethod(req),

          path:
            requestPath(req),

          ip:
            text(
              req.headers[
                "x-forwarded-for"
              ] ||
              req.socket?.remoteAddress ||
              ""
            ),

          statusCode:
            res.statusCode,

          success,

          durationMs:
            Date.now() -
            startedAt,

          createdAt:
            new Date()
              .toISOString()
        });
      } catch (error) {
        console.error(
          "Audit log write error:",
          error.message
        );
      }
    }
  );

  next();
}

module.exports =
  auditLogMiddleware;

module.exports.inferRequestUser =
  inferRequestUser;

module.exports.inferSource =
  inferSource;

module.exports.classifyRequest =
  classifyRequest;
