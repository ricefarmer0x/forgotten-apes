import React, { useEffect } from "react";
import { Row, Col, Card } from "antd";
import { Link } from "react-router-dom";
import LazyLoad from "react-lazyload";
import { forceCheck } from "react-lazyload";
import BaycImage from "./BaycImage";

const ApesMain = (props) => {
  const { unclaimed, loading } = props;

  // Lazy load on sorting function
  useEffect(() => {
    forceCheck();
  }, [unclaimed]);

  return (
    <div className="main-apes">
      <Row
        gutter={[
          { xs: 8, sm: 12, md: 12, lg: 16 },
          { xs: 8, sm: 12, md: 12, lg: 16 },
        ]}
        justify="start"
        align="middle"
      >
        {unclaimed?.map((ape) => (
          <Col key={ape} xs={12} sm={8} md={8} lg={6} xl={4}>
            <LazyLoad height="100%" offset={100}>
              <Link to={`/ape/${ape}`}>
                <Card
                  hoverable
                  loading={loading}
                  cover={
                    <BaycImage
                      style={{ width: "100%" }}
                      alt={`Bored Ape ${ape}`}
                      tokenId={ape}
                    />
                  }
                >
                  <Card.Meta
                    style={{ textAlign: "center" }}
                    title={ape.toString()}
                  />
                </Card>
              </Link>
            </LazyLoad>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ApesMain;
