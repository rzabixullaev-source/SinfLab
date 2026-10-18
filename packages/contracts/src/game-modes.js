export function gameModesForSubject(subject = "") {
  const name = String(subject).toLocaleLowerCase("uz");
  const modes = ["choice", "fill"];
  if (/ingliz|english|language|(^|\s)til|rus|nemis|fransuz/.test(name)) return [...modes, "scramble"];
  if (/matematika|math|algebra|geometriya|fizika|physics|kimyo|chemistry/.test(name)) return [...modes, "numeric", "truefalse"];
  return [...modes, "truefalse"];
}
