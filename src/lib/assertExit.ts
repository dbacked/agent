const assertExit = (test, message) => {
  if (!test) {
    console.error(message);
    process.exit(1);
  }
};

export default assertExit;
