"use client";

export default function CountrySelect({ value, options }: { value: string; options: { code: string; name: string }[] }) {
  return (
    <select id="pays" name="pays" defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((o) => (
        <option key={o.code} value={o.code}>{o.name}</option>
      ))}
    </select>
  );
}
