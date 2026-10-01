async function main() {
  throw new Error(
    "Otherside claims are closed. The site uses the preserved 266-ID historical dataset; this audit is intentionally disabled."
  );
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
