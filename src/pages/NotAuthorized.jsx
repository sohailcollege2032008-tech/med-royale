import { Link } from 'react-router-dom'

export default function NotAuthorized() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
      <h1 className="mb-4 text-4xl font-bold text-warning font-display">Not Authorized</h1>
      <p className="mb-8 text-xl text-gray-400 font-sans">Sorry, you don't have permission to access this page.</p>
      <Link 
        to="/"
        className="rounded-xl bg-primary px-8 py-3 font-bold text-background transition-transform hover:scale-105 active:scale-95 font-sans"
      >
        Return Home
      </Link>
    </div>
  )
}
