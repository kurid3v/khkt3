import React, { useState } from 'react';

interface SignUpPageProps {
  onSignUp: (name: string, role: 'teacher' | 'student', password: string) => { success: boolean; message?: string };
  onBackToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    
    const result = onSignUp(name, role, password);
    if (!result.success) {
        setError(result.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    }
  };
  
  const inputClasses = "block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900">Tạo tài khoản</h1>
            <p className="text-slate-600 mt-2">Tham gia Lớp học AI ngay hôm nay</p>
          </div>
          
          {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4 text-center">{error}</p>}

          <div className="mb-4">
            <label htmlFor="name-input" className="block text-slate-700 text-sm font-bold mb-2">
              Họ và tên (dùng để đăng nhập)
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className={inputClasses}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password-input" className="block text-slate-700 text-sm font-bold mb-2">
              Mật khẩu
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              className={inputClasses}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm-password-input" className="block text-slate-700 text-sm font-bold mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className={inputClasses}
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-700 text-sm font-bold mb-2">
              Bạn là
            </label>
            <div className="flex rounded-lg border border-slate-300 p-1">
                <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${role === 'student' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    Học sinh
                </button>
                <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${role === 'teacher' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    Giáo viên
                </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name || !password || !confirmPassword}
            >
              Đăng ký
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            >
              &larr; Quay lại Đăng nhập
            </button>
          </div>
        </form>
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>Cung cấp bởi công nghệ AI tiên tiến.</p>
        </footer>
      </div>
    </div>
  );
};

export default SignUpPage;