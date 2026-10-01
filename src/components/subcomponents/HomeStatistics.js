import React from "react";
import { Row, Col, Statistic, Card } from "antd";
import { Link } from "react-router-dom";
import {
  unclaimedApecoinApes,
  unclaimedDogTokenIds,
  unclaimedOthersideApes,
  unclaimedSewerApes,
  confirmedBurnedApeIds,
  lostApesSnapshot,
} from "../data/lostApesData";

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
              <Statistic title="Lost Apes" value={lostApesSnapshot.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/burned-apes">
            <Card hoverable>
              <Statistic title="Burned Apes" value={confirmedBurnedApeIds.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/unclaimed-ape">
            <Card hoverable>
              <Statistic title="Unclaimed $APE" value={unclaimedApecoinApes.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/unclaimed-dog">
            <Card hoverable>
              <Statistic title="Unclaimed Dog" value={unclaimedDogTokenIds.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/unclaimed-otherside">
            <Card hoverable>
              <Statistic title="Unclaimed Otherside" value={unclaimedOthersideApes.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={8} md={8} lg={8} xl={6}>
          <Link to="/unclaimed-sewer">
            <Card hoverable>
              <Statistic title="Unclaimed Sewer" value={unclaimedSewerApes.length} />
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default HomeStatistics;
