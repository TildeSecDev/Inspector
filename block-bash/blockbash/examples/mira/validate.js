module.exports = function validate({ command, commandOutput, flag, step }) {
  const originalCmd = command || '';
  const cmd = originalCmd.toLowerCase();
  // Accept flag submissions via command text as a fallback, e.g.:
  //  - submit-flag SSID_FLAG{...}
  //  - any command containing SOME_FLAG{...}
  if (!flag) {
    // submit-flag PREFIX
    const sf = originalCmd.match(/\bsubmit-flag\s+([A-Z_]+_FLAG\{[^}]+\})/i);
    if (sf) flag = sf[1];
    // generic inline flag pattern
    if (!flag) {
      const m = originalCmd.match(/([A-Z_]+_FLAG\{[^}]+\})/);
      if (m) flag = m[1];
    }
  }
  // Infer step from command to support backend that doesn't pass 'step'
  const inferred = (() => {
    if (cmd.includes('airodump-ng --manufacturer')) return 4;
    if (cmd.includes('airodump-ng')) return 1;
    if (cmd.includes('iw dev wlan0 set type managed')) return 2;
    if (cmd.includes('aircrack-ng')) return 3;
    if (cmd.includes('macchanger')) return 5;
    if (cmd.includes('nmap -sn') || cmd.includes('arp-scan')) return 6;
    return null;
  })();
  const s = step || inferred;

  // Step 1: Spoofed SSID Cleanup
  if (s === 1) {
    if (cmd.includes('airodump-ng')) {
      return { pass: true, flagRequired: true, stepNumber: 1, hint: "Now submit the flag you found (e.g., SSID_FLAG{...})" };
    }
    if (flag) {
      if (flag === "SSID_FLAG{coffeeshop_spoofed}") return { pass: true };
      return { pass: false, hint: "Incorrect flag for step 1." };
    }
    return { pass: false, hint: "Run airodump-ng to scan for APs." };
  }
  // Step 2: Deauth Defense
  if (s === 2) {
    if (cmd.includes('iw dev wlan0 set type managed')) {
      return { pass: true, flagRequired: true, stepNumber: 2, hint: "Now submit the flag you found (e.g., DEAUTH_FLAG{...})" };
    }
    if (flag) {
      if (flag === "DEAUTH_FLAG{deauth_blocked}") return { pass: true };
      return { pass: false, hint: "Incorrect flag for step 2." };
    }
    return { pass: false, hint: "Run the command to set interface to managed mode." };
  }
  // Step 3: Secure Handshake Verification
  if (s === 3) {
    if (cmd.includes('aircrack-ng')) {
      return { pass: true, flagRequired: true, stepNumber: 3, hint: "Now submit the flag you found (e.g., HANDSHAKE_FLAG{...})" };
    }
    if (flag) {
      if (flag === "HANDSHAKE_FLAG{psk_verified}") return { pass: true };
      return { pass: false, hint: "Incorrect flag for step 3." };
    }
    return { pass: false, hint: "Use aircrack-ng to verify the handshake." };
  }
  // Step 4: Beacon Integrity Audit
  if (s === 4) {
    if (cmd.includes('airodump-ng --manufacturer')) {
      return { pass: true, flagRequired: true, stepNumber: 4, hint: "Now submit the flag you found (e.g., BEACON_FLAG{...})" };
    }
    if (flag) {
      if (flag === "BEACON_FLAG{abnormal_beacon}") return { pass: true };
      return { pass: false, hint: "Incorrect flag for step 4." };
    }
    return { pass: false, hint: "Scan for abnormal beacon intervals." };
  }
  // Step 5: MAC-Whitelist Enforcement
  if (s === 5) {
    if (cmd.includes('macchanger')) {
      return { pass: true, flagRequired: true, stepNumber: 5, hint: "Now submit the flag you found (e.g., MAC_FLAG{...})" };
    }
    if (flag) {
      if (flag === "MAC_FLAG{whitelist_restored}") return { pass: true };
      return { pass: false, hint: "Incorrect flag for step 5." };
    }
    return { pass: false, hint: "Use macchanger to restore the whitelist." };
  }
  // Step 6+: Generic host discovery acceptance for network scanning lessons
  if (s === 6) {
    if (cmd.includes('nmap -sn') || cmd.includes('arp-scan')) {
      return { pass: true, stepNumber: 6, hint: "Host sweep recognized." };
    }
    return { pass: false, hint: "Try 'nmap -sn' for a ping sweep or 'arp-scan'." };
  }
  return { pass: false, hint: "Unknown step or missing input." };
};
