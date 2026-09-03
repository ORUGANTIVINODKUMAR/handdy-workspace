require("dotenv").config();

const { verifyEmailTransport } = require("../src/utils/mailer");

const run = async () => {
  const isVerified = await verifyEmailTransport();
  process.exitCode = isVerified ? 0 : 1;
};

run();
