import React, { useState } from "react";
import { Layout, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import {
  ApesMain,
  HomeStatistics,
} from "./subcomponents/subcomponents";
import { getRandomApes } from "../functions/functions";
import { lostApesSnapshot } from "./data/lostApesData";

const { Content } = Layout;
const { Text } = Typography;

const Home = () => {
  const [homeApes] = useState(() => getRandomApes(lostApesSnapshot, 12));

  return (
    <Content>
      <HomeStatistics />
      <div className="home-feature">
        <Text type="secondary" className="home-link">
          <Link to="/lost-apes">
            Check out more Lost Apes <ArrowRightOutlined />
          </Link>
        </Text>
      </div>
      <ApesMain unclaimed={homeApes} />
    </Content>
  );
};

export default Home;
