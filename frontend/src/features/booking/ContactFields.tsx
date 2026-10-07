import type { Contact, ContactErrors } from "../../lib/booking";
import b from "./booking.module.css";

/** Họ tên · SĐT · email. `compact` = xếp dọc trong phiếu chat; `idPrefix` để id ô nhập không trùng khi có nhiều phiếu. */
export default function ContactFields({ value, onChange, errors, compact = false, idPrefix = "bk" }: {
  value: Contact; onChange: (c: Contact) => void; errors: ContactErrors; compact?: boolean; idPrefix?: string;
}) {
  const field = (key: keyof Contact, label: string, extra: { type?: string; autoComplete: string; full?: boolean; inputMode?: "tel" | "email" }) => {
    const id = `${idPrefix}-${key}`;
    const err = errors[key];
    return (
      <div className={`${b.field} ${extra.full ? b.full : ""}`}>
        <label htmlFor={id}>{label}</label>
        <input className={b.control} id={id} type={extra.type ?? "text"} autoComplete={extra.autoComplete} inputMode={extra.inputMode}
          value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })}
          aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-err` : undefined} />
        {err && <span className={b.err} id={`${id}-err`}>{err}</span>}
      </div>
    );
  };
  return (
    <div className={`${b.fields} ${compact ? b.compact : ""}`}>
      {field("name", "Họ và tên", { autoComplete: "name", full: true })}
      {field("phone", "Số điện thoại", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
      {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
    </div>
  );
}
