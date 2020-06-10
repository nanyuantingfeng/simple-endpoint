/***************************************************
 * Created by nanyuantingfeng on 2020/6/9 15:03. *
 ***************************************************/

describe('simple call function connect at main page', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(`file://${__dirname}/../examples/example-0-simple-connect-in-main-page/main.html`)
  })

  afterAll(async () => {
    await page.close()
  })

  it('should call function invocations between "main" and "iframe"', async () => {
    const button = await page.$('#button-0')
    await button.click()
    await page.waitFor(1000)
    const result = await page.evaluate(() => {
      return window.__RESULT__
    })
    expect(result).toEqual({ ax: false, d: { e: 99 }, f: 1 })

    const iframeHandle = await page.$('#iframe-0')
    const iframe = await iframeHandle.contentFrame()
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
