// Run once with Node's --env-file=apps/api/.env from the repository root.
const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const [email, credentialFile] = process.argv.slice(2);
  if (!email || !credentialFile || !email.includes("@")) {
    throw new Error(
      "Usage: bootstrap-admin.cjs <admin email> <private credential file>",
    );
  }
  const prisma = new PrismaClient();
  let createdCredentialFile = false;
  try {
    if (await prisma.user.count()) {
      throw new Error(
        "Bootstrap requires an empty user table; existing accounts were preserved.",
      );
    }
    const password = crypto.randomBytes(24).toString("base64url");
    fs.writeFileSync(
      credentialFile,
      JSON.stringify(
        {
          url: process.env.FRONTEND_URL,
          email,
          password,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    createdCredentialFile = true;
    await prisma.user.create({
      data: {
        email,
        fullName: "Gromoze Platform Administrator",
        role: "SUPER_ADMIN",
        isActive: true,
        twoFactorEnabled: false,
        passwordHash: await argon2.hash(password),
      },
    });
    console.log(
      "Platform administrator created. Credentials saved to the specified private file.",
    );
  } catch (error) {
    if (createdCredentialFile) fs.unlinkSync(credentialFile);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
