// Demo validate.js for Trace the Hacker
module.exports = function validate({ command, commandOutput, step }) {
  // step is expected to be passed in for context
  const IP = "10.0.0.42";
  if (step === 1) {
    // Accept ping command to the IP
    if (/ping\s+10\.0\.0\.42/.test(command)) return { pass: true };
    return { pass: false, hint: "Try ping 10.0.0.42" };
  }
  if (step === 2) {
    // Accept nmap command
    if (/nmap.*10\.0\.0\.42/.test(command)) return { pass: true };
    return { pass: false, hint: "Try nmap -sV 10.0.0.42" };
  }
  if (step === 3) {
    // Accept ssh command
    if (/ssh\s+MrE@10\.0\.0\.42/.test(command)) return { pass: true };
    return { pass: false, hint: "Try ssh MrE@10.0.0.42" };
  }
  if (step === 4) {
    // Accept xdg-open command
    if (/xdg-open\s+https:\/\/youtube\.com\/watch\?v=dQw4w9WgXcQ/.test(command)) return { pass: true };
    return { pass: false, hint: "Try xdg-open https://youtube.com/watch?v=dQw4w9WgXcQ" };
  }
  // Steps 0, 5, 6 are not command-validated
  return { pass: true };
};
