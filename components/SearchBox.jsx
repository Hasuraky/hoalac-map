'use client';

export default function SearchBox({ value, onChange }) {
  return (
    <div className="searchbox">
      <svg className="searchbox-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        placeholder="Tìm mã, tên hoặc địa chỉ..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="searchbox-clear" onClick={() => onChange('')} aria-label="Xóa">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
