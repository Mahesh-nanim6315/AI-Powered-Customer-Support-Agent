import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../config/database";

function printUsage() {
  console.log("Usage: npm.cmd run reset-password -- <email> <new-password>");
}

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    printUsage();
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, orgId: true },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  if (user.role === "CUSTOMER") {
    await prisma.customer.updateMany({
      where: { userId: user.id },
      data: {
        password: hashedPassword,
        status: "ACTIVE",
      },
    });
  }

  console.log(`Password updated for ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error("Failed to reset password:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
