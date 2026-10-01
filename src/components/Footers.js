import React from "react";
import { Layout } from "antd";
import { GithubOutlined, TwitterOutlined } from "@ant-design/icons";

const { Footer } = Layout;

const Footers = () => {
  return (
    <Footer
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="footer-blank">
        <div>
          <a
            href="https://etherscan.io/address/0xd3c6e4583bcc33339d733cb35034362d134a6749"
            target="_blank"
            rel="noreferrer"
          >
            ricefarmer.eth
          </a>
        </div>
      </div>
      <div className="footer-text">
        <div>Rice Labs © {new Date().getFullYear()}</div>
        <div>All Rights Reserved</div>
      </div>
      <div className="footer-logos">
        <a
          href="https://github.com/ricefarmer0x"
          target="_blank"
          rel="noreferrer"
        >
          <GithubOutlined />
        </a>
        <a href="https://x.com/RiceFarmer0x" target="_blank" rel="noreferrer">
          <TwitterOutlined />
        </a>
      </div>
    </Footer>
  );
};

export default Footers;
