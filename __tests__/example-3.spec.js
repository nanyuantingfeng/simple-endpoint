/***************************************************
 * Created by nanyuantingfeng on 2020/6/10 09:56. *
 ***************************************************/

describe('connect main & nested iframe', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(`file://${__dirname}/../examples/example-3-connect-nested-iframe/main.html`)
  })

  afterAll(async () => await page.close())

  async function getLeafIframeById(id0, id1) {
    const iframeHandle0 = await page.$(id0)
    const iframe0 = await iframeHandle0.contentFrame()
    const iframeHandle1 = await iframe0.$(id1)
    return await iframeHandle1.contentFrame()
  }

  it('should call function invocations between "main" and "iframe in iframe"', async () => {
    const button = await page.$('#button-0')
    await button.click()
    await page.waitFor(1000)

    const result = await page.evaluate(() => {
      return window.__RESULT__
    })
    expect(result).toEqual({ ax: false, d: { e: 99 }, f: 1 })

    const iframe = await getLeafIframeById('#iframe-0', '#iframe-1')
    await iframe.waitForSelector('#button-0')
    const button2 = await iframe.$('#button-0')
    await button2.click()
    await page.waitFor(1000)

    const result2 = await iframe.evaluate(() => {
      return window.__RESULT__
    })
    expect(result2).toEqual({ K: 22 })
  })
})
