import React, { useEffect, useRef, useState } from "react";
import { Button, Row, Col, Card, Pagination, Segmented } from "antd";
import html2canvas from "html2canvas";
import { Link } from "react-router-dom";
import BaycImage from "./BaycImage";

const PAGE_SIZE = 24;

const ApesMain = (props) => {
  const { unclaimed, loading, showAllViews = true } = props;
  const [view, setView] = useState("cards");
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const gridRef = useRef(null);

  const total = unclaimed?.length || 0;
  const visibleApes = unclaimed?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isExpandedView = showAllViews && view !== "cards";
  const displayedApes = isExpandedView ? unclaimed : visibleApes;

  // A new search or sort starts from the first page and only mounts one page
  // of image requests at a time.
  useEffect(() => {
    setPage(1);
  }, [unclaimed]);

  const downloadGrid = async () => {
    if (!gridRef.current) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: "#f5f5f5",
        logging: false,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "forgotten-apes-image-grid.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (view === "gallery") {
    return (
      <div className="main-apes gallery-view">
        <ViewControls
          view={view}
          setView={setView}
          onDownload={downloadGrid}
          downloading={downloading}
        />
        <div ref={gridRef} className="apes-image-grid">
          {displayedApes?.map((ape) => (
            <Link key={ape} to={`/ape/${ape}`} aria-label={`View Bored Ape ${ape}`}>
              <BaycImage
                alt={`Bored Ape ${ape}`}
                eager
                tokenId={ape}
                style={{ width: "100%" }}
              />
            </Link>
          ))}
        </div>
        {!isExpandedView && <ApePagination current={page} total={total} onChange={setPage} />}
      </div>
    );
  }

  const compact = view === "compact";
  return (
    <div className={`main-apes ${compact ? "compact-view" : ""}`}>
      {showAllViews && <ViewControls view={view} setView={setView} />}
      <Row
        gutter={[
          compact ? { xs: 6, sm: 8, md: 8, lg: 10 } : { xs: 8, sm: 12, md: 12, lg: 16 },
          compact ? { xs: 6, sm: 8, md: 8, lg: 10 } : { xs: 8, sm: 12, md: 12, lg: 16 },
        ]}
        justify="start"
        align="middle"
      >
        {displayedApes?.map((ape) => (
          <Col key={ape} xs={compact ? 8 : 12} sm={compact ? 6 : 8} md={compact ? 4 : 8} lg={compact ? 3 : 6} xl={compact ? 2 : 4}>
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
          </Col>
        ))}
      </Row>
      {!isExpandedView && <ApePagination current={page} total={total} onChange={setPage} />}
    </div>
  );
};

const ViewControls = ({ view, setView, onDownload, downloading }) => (
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
    {view === "gallery" && (
      <Button loading={downloading} onClick={onDownload}>
        Download PNG
      </Button>
    )}
  </div>
);

const ApePagination = ({ current, total, onChange }) => {
  if (total <= PAGE_SIZE) return null;

  return (
    <div className="ape-pagination">
      <Pagination
        current={current}
        pageSize={PAGE_SIZE}
        total={total}
        showSizeChanger={false}
        showQuickJumper
        showTotal={(count, range) => `${range[0]}-${range[1]} of ${count}`}
        onChange={onChange}
      />
    </div>
  );
};

export default ApesMain;
