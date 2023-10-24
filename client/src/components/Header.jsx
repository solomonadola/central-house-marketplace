import { FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
export default function Header() {
  return (
    <header className="bg-orange-400 shadow-md">
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3">
        <Link to="/">
          <h1 className="font-bold text-sm sm:text-xl flex flex-wrap">
            <span>central house </span>
            <span className="text-slate-600"> &nbsp; marketplace</span>
          </h1>
        </Link>

        <form
          action=""
          className="bg-green-100 p-3 rounded-2xl flex items-center"
        >
          <input
            type="text"
            placeholder="Find..."
            className="bg-transparent outline-none w-24 sm:w-64"
          />
          <FaSearch className="text-yellow-500" />
        </form>

        <ul className="flex gap-4">
          <Link to="/">
            <li className="hidden sm:inline text-slate-600 hover:underline ">
              Home
            </li>
          </Link>
          <Link to="/about">
            <li className="hidden sm:inline text-slate-600 hover:underline">
              About
            </li>
          </Link>
          <Link to="/sign-in">
            <li className="sm:inline text-slate-600 hover:underline">
              Sign in
            </li>
          </Link>
        </ul>
      </div>
    </header>
  );
}
