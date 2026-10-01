import React from "react";
import { Layout, Menu, ConfigProvider } from "antd";
import { Link } from "react-router-dom";

const { Header } = Layout;

const Navbar = () => {
  const items = [
    {
      key: 1,
      label: <Link to="/lost-apes">Lost Apes</Link>,
    },
    {
      key: 5,
      label: <Link to="/burned-apes">Burned Apes</Link>,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            colorPrimary: "#1677ff",
          },
        },
      }}
    >
      <Header
        className="navbar"
        style={{ position: "sticky", top: 0, zIndex: 1, width: "100%" }}
      >
        <div className="logo">
          <Link to="/">Forgotten Apes</Link>
        </div>
        <Menu
          mode="horizontal"
          theme="dark"
          items={items}
          style={{ position: "sticky", justifyContent: "flex-start" }}
        />
      </Header>
    </ConfigProvider>
  );
};

export default Navbar;
