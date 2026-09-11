/**
 * Two mandatory confirmations shown on every email-signup form. Both must be
 * checked before an account can be created or email access unlocked.
 */
export function SignupAcknowledgements({
  age21,
  researchUse,
  onAge21,
  onResearchUse,
  idPrefix = "ack",
}: {
  age21: boolean;
  researchUse: boolean;
  onAge21: (v: boolean) => void;
  onResearchUse: (v: boolean) => void;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-3">
      <label
        htmlFor={`${idPrefix}-age21`}
        className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground"
      >
        <input
          id={`${idPrefix}-age21`}
          type="checkbox"
          checked={age21}
          onChange={(e) => onAge21(e.target.checked)}
          required
          className="mt-0.5 accent-blood"
        />
        <span>I confirm that I am 21 years of age or older.</span>
      </label>
      <label
        htmlFor={`${idPrefix}-research`}
        className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground"
      >
        <input
          id={`${idPrefix}-research`}
          type="checkbox"
          checked={researchUse}
          onChange={(e) => onResearchUse(e.target.checked)}
          required
          className="mt-0.5 accent-blood"
        />
        <span>
          I understand that any peptide information and sources provided are for research purposes
          only and are not for human or animal use.
        </span>
      </label>
    </div>
  );
}
