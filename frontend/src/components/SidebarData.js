import React from "react";
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import ResetPassword from "./ResetPassword";
import { Link } from "react-router-dom";
import LogoutButton from "./LogoutButton";
export const SidebarData = [
    {
        title: "Dashboard",
        icon: <HomeIcon />,
        link: "/"
    },
    {
        title: "Users",
        icon: <PersonIcon />,
        link: "/users"
    },
    {
        title: "Chart Data",
        icon: <NotificationsIcon />,
        link: "/notifications"
    },

    {
        title: <LogoutButton/>,
        // icon: <LogoutButton />,
        link: "/login"
    }
]