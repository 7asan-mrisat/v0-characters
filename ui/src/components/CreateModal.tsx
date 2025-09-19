import React, { useState } from "react";

export const CreateModal: React.FC<{
  open: boolean;
  onClose: ()=>void;
  onSubmit: (payload: any)=>void;
  genders: string[];
}> = ({ open, onClose, onSubmit, genders }) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState(genders[0] || "male");

  if (!open) return null;

  const submit = () => {
    onSubmit({ firstname, lastname, dob, gender });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] max-w-[92vw] bg-panel border border-white/10 rounded-2xl p-6">
        <div className="text-xl font-semibold mb-1">New Character</div>
        <div className="text-textDim mb-4 text-sm">Fill identity details</div>

        <div className="grid grid-cols-2 gap-3">
          <input value={firstname} onChange={e=>setFirstname(e.target.value)} placeholder="First name" className="input col-span-1" />
          <input value={lastname} onChange={e=>setLastname(e.target.value)} placeholder="Last name" className="input col-span-1" />
          <input value={dob} onChange={e=>setDob(e.target.value)} placeholder="YYYY-MM-DD" className="input col-span-1" />
          <select value={gender} onChange={e=>setGender(e.target.value)} className="input col-span-1">
            {genders.map(g=> <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">Cancel</button>
          <button onClick={submit} className="btn">Create</button>
        </div>
      </div>
    </div>
  );
};
