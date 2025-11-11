const fs = require('fs');
const path = require('path');
module.exports = function validate({ command = '', commandOutput = '', step = null, flag = '' }) {
  try {
    if (!step && typeof step !== 'number') return { pass: false, hint: 'Open the step first so we know what to validate.' };
    const baseDir = __dirname;
    const candidates = [path.join(baseDir, `step${step}.json`)];
    const alt = (fs.readdirSync(baseDir).find(f => f.toLowerCase().includes(`step${step}`) && f.endsWith('.json')) || null);
    if (alt) candidates.push(path.join(baseDir, alt));
    const file = candidates.find(f => fs.existsSync(f));
    if (!file) return { pass: false, hint: 'Step file not found for this chapter.' };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const v = data.validation || {};
    const hint = (Array.isArray(data.hints) && data.hints[0]) || v.hint || 'Try the required command for this step.';
    if (v.command && (!v.type || v.type === 'contains')) return String(command).includes(String(v.command)) ? { pass: true } : { pass: false, hint };
    if (v.type === 'equals' && v.command) return String(command).trim() === String(v.command).trim() ? { pass: true } : { pass: false, hint };
    if (v.type === 'regex' && v.pattern) { try { const re = new RegExp(v.pattern); return re.test(String(command)) ? { pass: true } : { pass: false, hint }; } catch { return { pass: false, hint }; } }
    return command ? { pass: true } : { pass: false, hint };
  } catch (e) { return { pass: false, hint: 'Validation error in chapter12' }; }
};
