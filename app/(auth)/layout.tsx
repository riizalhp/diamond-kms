export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-surface-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md fade-in">
                <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 bg-navy-900 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-amber-400 text-2xl leading-none">◆</span>
                    </div>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-navy-900 font-display">
                    DIAMOND KMS
                </h2>
                <p className="mt-2 text-center text-sm text-text-500 max-w">
                    Enterprise Knowledge Management
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="card p-8 sm:px-10">
                    {children}
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-text-300">
                &copy; {new Date().getFullYear()} PT. Teknologi Maju. All rights reserved.
            </div>
        </div>
    )
}
