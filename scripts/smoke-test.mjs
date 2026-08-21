const allowedArguments = new Set(["--base-url", "--expect-signup"]);

function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const separatorIndex = argument.indexOf("=");
    const name =
      separatorIndex === -1 ? argument : argument.slice(0, separatorIndex);

    if (!allowedArguments.has(name)) {
      throw new Error("unknown argument: " + argument);
    }

    const value =
      separatorIndex === -1
        ? argv[index + 1]
        : argument.slice(separatorIndex + 1);
    if (!value || value.startsWith("--")) {
      throw new Error("missing value for " + name);
    }

    options[name] = value;
    if (separatorIndex === -1) index += 1;
  }

  return options;
}

function smokeConfiguration() {
  const options = parseArguments(process.argv.slice(2));
  const rawBaseUrl = options["--base-url"] ?? process.env.SMOKE_BASE_URL;
  const signupExpectation =
    options["--expect-signup"] ?? process.env.SMOKE_EXPECT_SIGNUP;

  if (!rawBaseUrl) throw new Error("base URL is required");
  if (!["enabled", "disabled"].includes(signupExpectation)) {
    throw new Error("signup expectation must be enabled or disabled");
  }

  const baseUrl = new URL(rawBaseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("base URL must use http or https");
  }

  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "10000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) {
    throw new Error("SMOKE_TIMEOUT_MS must be between 100 and 60000");
  }

  return { baseUrl, signupExpectation, timeoutMs };
}

async function request(baseUrl, pathname, timeoutMs) {
  try {
    return await fetch(new URL(pathname, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "lucrivo-smoke-test" },
    });
  } catch {
    throw new Error("GET " + pathname + " could not connect");
  }
}

function expectStatus(response, pathname, expectedStatuses) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      "GET " +
        pathname +
        " returned " +
        response.status +
        ", expected " +
        expectedStatuses.join(" or "),
    );
  }

  console.log("[smoke] ok GET " + pathname + " -> " + response.status);
}

function expectRedirect(response, pathname, expectedPath) {
  expectStatus(response, pathname, [307, 308]);
  const location = response.headers.get("location");
  if (!location)
    throw new Error("GET " + pathname + " omitted redirect location");

  const destination = new URL(location, response.url);
  if (destination.pathname + destination.search !== expectedPath) {
    throw new Error("GET " + pathname + " redirected to an unexpected path");
  }
}

async function runSmokeTest() {
  const { baseUrl, signupExpectation, timeoutMs } = smokeConfiguration();

  const health = await request(baseUrl, "/api/health", timeoutMs);
  expectStatus(health, "/api/health", [200]);

  let healthBody;
  try {
    healthBody = await health.json();
  } catch {
    throw new Error("GET /api/health returned invalid JSON");
  }
  if (healthBody?.status !== "ok" || healthBody?.service !== "lucrivo") {
    throw new Error("GET /api/health returned an invalid contract");
  }

  const login = await request(baseUrl, "/login", timeoutMs);
  expectStatus(login, "/login", [200]);

  const dashboard = await request(baseUrl, "/dashboard", timeoutMs);
  expectRedirect(dashboard, "/dashboard", "/login");

  const updatePassword = await request(baseUrl, "/update-password", timeoutMs);
  expectStatus(updatePassword, "/update-password", [200]);

  const register = await request(baseUrl, "/register", timeoutMs);
  if (signupExpectation === "enabled") {
    expectStatus(register, "/register", [200]);
  } else {
    expectRedirect(register, "/register", "/login?status=signup_disabled");
  }

  console.log("[smoke] passed " + baseUrl.origin);
}

runSmokeTest().catch((error) => {
  const message = error instanceof Error ? error.message : "unexpected failure";
  console.error("[smoke] failed: " + message);
  process.exitCode = 1;
});
