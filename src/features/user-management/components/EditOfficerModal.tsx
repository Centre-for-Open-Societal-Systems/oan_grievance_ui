'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { formatToE164, splitPhoneNumber } from '@/lib/validation/phone';
import { validateEmail, validateFullName, validateOptionalLocalPhone, validateRequired } from '@/lib/validation/fieldRules';
import { focusFirstError, useFieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from './AnimatedSelect';
import type { Officer, OfficerStatus } from '../data/officers';

interface EditOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: Officer | null;
  onSave: (officer: Officer) => void;
}

const STATUS_OPTIONS: OfficerStatus[] = ['Active', 'On Leave', 'Inactive'];

type FormField = 'name' | 'email' | 'phoneNumber' | 'roleTitle';

const FIELD_IDS: Record<FormField, string> = {
  name: 'edit-admin-full-name',
  email: 'edit-admin-email',
  phoneNumber: 'edit-admin-phone',
  roleTitle: 'edit-admin-role-title',
};

const FIELD_ORDER: Array<{ key: FormField; id: string }> = (Object.keys(FIELD_IDS) as FormField[]).map((key) => ({
  key,
  id: FIELD_IDS[key],
}));

/**
 * Caller remounts this on `officer` change (`key={officer?.id ?? 'closed'}`),
 * so the form only ever needs to seed from `officer` once, at mount.
 */
export function EditOfficerModal({ isOpen, onClose, officer, onSave }: EditOfficerModalProps) {
  const initialPhone = officer && officer.phone !== '-' ? splitPhoneNumber(officer.phone) : { phoneCode: '+251', phoneNumber: '' };

  const [name, setName] = useState(officer?.name ?? '');
  const [roleTitle, setRoleTitle] = useState(officer?.roleTitle ?? '');
  const [department, setDepartment] = useState(officer?.department ?? '');
  const [email, setEmail] = useState(officer?.email ?? '');
  const [countryCode, setCountryCode] = useState(initialPhone.phoneCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.phoneNumber);
  const [region, setRegion] = useState(officer?.region ?? '');
  const [status, setStatus] = useState<string>(officer?.status ?? 'Active');
  const { errors: fieldErrors, setError, setAll } = useFieldErrors<FormField>();

  if (!isOpen || !officer) return null;

  const validateField = (field: FormField): string | null => {
    switch (field) {
      case 'name':
        return validateFullName(name);
      case 'email':
        return email.trim() ? validateEmail(email) : null;
      case 'phoneNumber':
        return validateOptionalLocalPhone(phoneNumber, countryCode);
      case 'roleTitle':
        return validateRequired(roleTitle, 'Enter a role title.');
    }
  };

  const handleSave = () => {
    const errors = Object.fromEntries(
      FIELD_ORDER.map(({ key }) => [key, validateField(key)]).filter(([, message]) => message)
    );
    if (Object.keys(errors).length > 0) {
      setAll(errors);
      focusFirstError(FIELD_ORDER, errors);
      return;
    }

    onSave({
      ...officer,
      name,
      roleTitle,
      department,
      email,
      phone: phoneNumber ? formatToE164(phoneNumber, countryCode) : '-',
      region,
      status: status as OfficerStatus,
      avatarInitials:
        name
          .split(' ')
          .map((part) => part[0])
          .filter(Boolean)
          .join('')
          .toUpperCase()
          .slice(0, 2) || officer.avatarInitials,
    });
  };

  const fieldError = (field: FormField) => {
    const message = fieldErrors[field];
    return message ? <FieldError id={errorIdFor(FIELD_IDS[field])}>{message}</FieldError> : null;
  };
  const a11y = (field: FormField) => {
    const id = FIELD_IDS[field];
    const message = fieldErrors[field];
    return {
      id,
      'aria-invalid': message ? (true as const) : undefined,
      'aria-describedby': message ? errorIdFor(id) : undefined,
      onBlur: () => setError(field, validateField(field)),
    };
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Officer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110">
            <X size={20} />
          </button>
        </div>

        {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
        <form className="contents" onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
          <div className="p-8 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.name} className="text-sm font-bold text-gray-900">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('name')}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Full Name"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('name')}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.email} className="text-sm font-bold text-gray-900">
                  Email ID
                </label>
                <input
                  {...a11y('email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email ID"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('email')}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.phoneNumber} className="text-sm font-bold text-gray-900">
                  Phone
                </label>
                <PhoneField
                  id={FIELD_IDS.phoneNumber}
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  placeholder="Enter Phone Number"
                  invalid={!!fieldErrors.phoneNumber}
                  describedBy={fieldErrors.phoneNumber ? errorIdFor(FIELD_IDS.phoneNumber) : undefined}
                  onBlur={() => setError('phoneNumber', validateField('phoneNumber'))}
                />
                {fieldError('phoneNumber')}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Enter Region"
                  className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={FIELD_IDS.roleTitle} className="text-sm font-bold text-gray-900">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  {...a11y('roleTitle')}
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Enter Role Title"
                  className={`border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors ${INVALID_INPUT_STYLES}`}
                />
                {fieldError('roleTitle')}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter Department"
                  className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">
                  Status <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} placeholder="Select Status" />
              </div>
            </div>
          </div>

          <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
