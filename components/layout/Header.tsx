/**
 * @file Mobile Header Component (Header.tsx)
 * @description This component renders the header bar that is visible only on smaller
 * screens (mobile devices). It contains the application logo and a "hamburger" menu
 * button that, when clicked, triggers a function to open the main sidebar navigation.
 */

import React from 'react';
import { AppLogoIcon, MenuIcon } from '../shared/Icons';

/**
 * Props for the Header component.
 */
interface HeaderProps {
  /** A callback function to be executed when the menu icon is clicked. */
  onToggleSidebar: () => void;
}

/**
 * A simple header component displayed at the top of the screen on mobile devices.
 * It provides basic branding and a control to open the main navigation sidebar.
 *
 * @param {HeaderProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered header element.
 */
const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-20">
      {/* Application Logo and Name */}
      <div className="flex items-center space-x-2 text-xl font-bold">
        <AppLogoIcon className="w-6 h-6 text-primary" />
        <span>Incolor</span>
      </div>
      {/* Hamburger Menu Button to toggle the sidebar */}
      <button onClick={onToggleSidebar} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
        <MenuIcon className="w-6 h-6" />
      </button>
    </header>
  );
};

export default Header;
