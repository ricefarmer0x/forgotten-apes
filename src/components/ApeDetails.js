import React from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { darkSelector } from "../store/store";
import { Row, Col, Card, Layout, Button, ConfigProvider } from "antd";
import { useGetNftMetadataQuery } from "../services/alchemyApi";
import { Loader, ErrorMsg } from "./subcomponents/subcomponents";
import { useGetOwnersForNftQuery } from "../services/alchemyApi";
import BaycImage from "./subcomponents/BaycImage";

const { Content } = Layout;

const ApeDetails = () => {
  const { ape } = useParams();

  const darkMode = useSelector(darkSelector);

  const {
    data: traits,
    isFetching: traitsFetching,
    error: traitsError,
  } = useGetNftMetadataQuery(ape);

  const metadata = traits?.raw?.metadata?.attributes;

  const {
    data: address,
    isFetching: addressFetching,
    error: addressError,
  } = useGetOwnersForNftQuery(ape);
  const owner = address?.owners[0];

  if (traitsFetching || addressFetching) return <Loader />;
  if (traitsError || addressError) return <ErrorMsg />;

  return (
    <ConfigProvider
      theme={{
        components: {
          Button: {
            colorTextLightSolid: (darkMode ? "#000000" : "#fff"),
            controlOutline: "rgba(5, 145, 255, 0.1)",
          },
        },
    }}
      >
    <Content>
      <div className="ape-details-container">
        <div className="ape-details-image">
          <Row justify="end" className="ape-details-image-row">
            <Col xs={20} sm={20} md={20} lg={20} xl={20}>
              <a
                href={`https://etherscan.io/address/${owner}`}
                target="_blank"
                rel="noreferrer"
              >
                <Card
                  className="ape-details-card"
                  loading={false}
                  hoverable
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
              </a>
            </Col>
          </Row>
        </div>
        <div className="ape-details-body">
          <div className="ape-details-traits">
            <Row
              gutter={[
                { xs: 6, sm: 6, md: 12, lg: 12 },
                { xs: 6, sm: 6, md: 12, lg: 12 },
              ]}
              className="ape-details-traits-row"
            >
              <Col xs={20} sm={20} md={10} lg={10} xl={10}>
                <Card size="small" title="Trait Count">
                  {metadata?.length}
                </Card>
              </Col>
              {metadata?.map((data, index) => (
                <Col key={index} xs={20} sm={20} md={10} lg={10} xl={10}>
                  <Card size="small" title={data.trait_type}>
                    {data.value}
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          <div className="ape-details-links">
            <Row
              gutter={[
                { xs: 12, sm: 12, md: 12, lg: 12 },
                { xs: 12, sm: 12, md: 12, lg: 12 },
              ]}
            >
              <Col
                style={{ textAlign: "center" }}
                xs={12}
                sm={12}
                md={10}
                lg={10}
                xl={10}
              >
                <Button
                  type="primary"
                  href={`https://etherscan.io/nft/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/${ape}`}
                  target="_blank"
                >
                  Etherscan
                </Button>
              </Col>
              <Col
                style={{ textAlign: "center" }}
                xs={12}
                sm={12}
                md={10}
                lg={10}
                xl={10}
              >
                <Button
                  type="primary"
                  href={`https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/${ape}`}
                  target="_blank"
                >
                  Opensea
                </Button>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </Content>
    </ConfigProvider>
  );
};

export default ApeDetails;
