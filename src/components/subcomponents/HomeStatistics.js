import React from "react";
import { Row, Col, Statistic, Card } from "antd";
import { Link } from "react-router-dom";

// Verified from the current owner set and archive nonce comparison. Burned
// apes are included in Lost Apes, even if they do not meet an old claim-list
// filter.
const VERIFIED_LOST_APE_COUNT = 61;
const CONFIRMED_BURNED_APE_COUNT = 3;

const HomeStatistics = () => {
  return (
    <div className="home-stats">
      <Row
        gutter={[{ xs: 4, sm: 4, md: 6, lg: 6 }, 6]}
        justify="flex-start"
        align="middle"
      >
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/lost-apes">
            <Card hoverable>
              <Statistic title="Lost Apes" value={VERIFIED_LOST_APE_COUNT} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/burned-apes">
            <Card hoverable>
              <Statistic title="Burned Apes" value={CONFIRMED_BURNED_APE_COUNT} />
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default HomeStatistics;
