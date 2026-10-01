import React, { useEffect, useState } from "react";
import { Row, Col, Card, Segmented } from "antd";
import { Link } from "react-router-dom";
import LazyLoad from "react-lazyload";
import { forceCheck } from "react-lazyload";
import BaycImage from "./BaycImage";

const ApesMain = (props) => {
  const { unclaimed, loading } = props;
  const [view, setView] = useState("cards");

  // Lazy load on sorting function
  useEffect(() => {
    forceCheck();
  }, [unclaimed]);

  const lazyPlaceholder = <div className="bayc-image-placeholder"><span>Loading…</span></div>;

  if (view === "gallery") {
    return (
      <div className="main-apes gallery-view">
        <ViewControls view={view} setView={setView} />
        <div className="apes-image-grid">
          {unclaimed?.map((ape) => (
            <LazyLoad key={ape} height={160} offset={200} placeholder={lazyPlaceholder}>
              <Link to={`/ape/${ape}`} aria-label={`View Bored Ape ${ape}`}>
                <BaycImage alt={`Bored Ape ${ape}`} tokenId={ape} style={{ width: "100%" }} />
              </Link>
            </LazyLoad>
          ))}
        </div>
      </div>
    );
  }

  const compact = view === "compact";
  return (
    <div className={`main-apes ${compact ? "compact-view" : ""}`}>
      <ViewControls view={view} setView={setView} />
      <Row
        gutter={[
          compact ? { xs: 6, sm: 8, md: 8, lg: 10 } : { xs: 8, sm: 12, md: 12, lg: 16 },
          compact ? { xs: 6, sm: 8, md: 8, lg: 10 } : { xs: 8, sm: 12, md: 12, lg: 16 },
        ]}
        justify="start"
        align="middle"
      >
        {unclaimed?.map((ape) => (
          <Col key={ape} xs={compact ? 8 : 12} sm={compact ? 6 : 8} md={compact ? 4 : 8} lg={compact ? 3 : 6} xl={compact ? 2 : 4}>
            <LazyLoad height={160} offset={200} placeholder={lazyPlaceholder}>
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

const ViewControls = ({ view, setView }) => (
  <div className="ape-view-controls">
    <Segmented
      value={view}
      onChange={setView}
      options={[
        { label: "Cards", value: "cards" },
        { label: "Compact", value: "compact" },
        { label: "Image grid", value: "gallery" },
      ]}
    />
  </div>
);

export default ApesMain;
