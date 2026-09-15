/****** Object:  StoredProcedure [dbo].[IF_JIG_INTERLOCK]    Script Date: 9/15/2026 3:33:40 PM ******/
SET ANSI_NULLS ON

SET QUOTED_IDENTIFIER ON



/************************************************************************************
1. 작성자     : Geunuky
2. 작성일자   : 2025.05.08
3. 수정자     : 
4. 수정일자   : 
5. 수정내용   : 
6. 기능       : JIG CEID 24 이벤트(Track-IN) 발생시 인터락
7. 연관테이블 : 
8. 연관 폼    : 
9. 비고       : 
**************************************************************************************/
CREATE PROCEDURE [dbo].[IF_JIG_INTERLOCK]
(
	  @AS_MACHCD NVARCHAR(30)
	, @AS_JIGID  NVARCHAR(40)
	, @AS_LOADTYPE NVARCHAR(10)
	, @LANG      NVARCHAR(10)
	, @RS_CODE	 NVARCHAR(1)    OUTPUT
	, @RS_MSG	 NVARCHAR(255)  OUTPUT
)
AS
BEGIN TRY

	SET NOCOUNT ON;

	DECLARE @PS_JIGSTATUS    NVARCHAR(10)
	      , @PS_PRODLOT      NVARCHAR(40)
		  , @PI_CNT          INT
	      , @PS_OPCD         NVARCHAR(30)
	      , @PS_WCCD         NVARCHAR(30)
		  , @PI_WORKNO       INT
		  , @PS_LASTOPCD     NVARCHAR(30)
		  , @PS_ITEMCD       NVARCHAR(40)
		  , @PS_ROUTEID      NVARCHAR(30)
		  , @PD_INDT         DATETIME
		  , @PD_OUTDT        DATETIME
		  , @PS_JIGOPCD      NVARCHAR(30)
		  , @PS_LOTSTATUS    NVARCHAR(10)
		  , @PS_LOTSTATUSNM  NVARCHAR(20)

	BEGIN

		SELECT @PS_WCCD = ISNULL(WC_CD,'')
		  FROM BM0070 WITH (NOLOCK)
		 WHERE MACH_CD = @AS_MACHCD

		SELECT @PS_OPCD = ISNULL(OP_CD,'')
		  FROM BM0060 WITH (NOLOCK)
		 WHERE WC_CD = @PS_WCCD

		IF(@PS_OPCD = '')
		BEGIN
			SET @RS_CODE = 'E'
			EXEC DBO.USP_GET_TRANSLATION '해당 설비의 공정이 MES 기준정보에 존재하지 않습니다.', @LANG, @RS_MSG OUTPUT;
			RETURN
		END

		-- JIG 테이블 존재 여부 확인
        IF NOT EXISTS ( SELECT 1
		                  FROM PP8000 WITH (NOLOCK)
						 WHERE JIG_ID = @AS_JIGID )
        BEGIN
			SET @RS_CODE = 'E'
			EXEC DBO.USP_GET_TRANSLATION '해당 JIG정보가 MES 기준정보에 존재하지 않습니다.(1)', @LANG, @RS_MSG OUTPUT;
			RETURN

		END

		IF NOT EXISTS ( SELECT 1
		                  FROM PP8010 WITH (NOLOCK)
						 WHERE JIG_ID = @AS_JIGID )
        BEGIN
			SET @RS_CODE = 'E'
			EXEC DBO.USP_GET_TRANSLATION '해당 JIG정보가 MES 기준정보에 존재하지 않습니다.(2)', @LANG, @RS_MSG OUTPUT;
			RETURN
		END

    	-- LOT_ID 조회
        SELECT @PS_PRODLOT   = LOT_NO
		     , @PS_JIGSTATUS = JIG_STATUS
			 , @PS_JIGOPCD   = OP_CD
			 , @PD_INDT      = JIG_INDT 
			 , @PD_OUTDT     = JIG_OUTDT
		  FROM PP8000 WITH (NOLOCK)
		 WHERE JIG_ID = @AS_JIGID;

		IF(@PS_JIGSTATUS <> 'W')
		BEGIN
			SET @RS_CODE = 'E'
			EXEC DBO.USP_GET_TRANSLATION '해당 JIG가 Wating 상태가 아닙니다.', @LANG, @RS_MSG OUTPUT;
			RETURN

		END

		IF ( @AS_LOADTYPE = '1') -- LOAD TYPE 제약조건 
		BEGIN
			IF(ISNULL(@PS_PRODLOT,'') = '')
			BEGIN
				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '해당 JIG의 LOT정보가 없습니다.', @LANG, @RS_MSG OUTPUT;
				RETURN
			END

			-- LOT STATUS 검증 ( RELEASE 상태확인 )
			SELECT
				  @PS_LOTSTATUS   = A.STATUS
				, @PS_LOTSTATUSNM = B.CD_NM
			FROM PP0041 A WITH (NOLOCK)
				LEFT JOIN BM0000 B WITH (NOLOCK) ON B.MAIN_CD  = 'LOT_STATUS' AND B.SUB_CD = A.STATUS
			WHERE 1=1
				AND A.LOT_NO = @PS_PRODLOT
				
			-- 2025-10-15 제약조건 명확하게 설정 시 적용 (김위원님이 이후 확정되면 다시 적용하는 것으로 정리)
			--IF (@PS_LOTSTATUS != 'XX')
			--BEGIN
			--	SET @RS_CODE = 'E'
			--	EXEC DBO.USP_GET_TRANSLATION 'Release 상태가 아닙니다. ', @LANG, @RS_MSG OUTPUT;
			--	SET @RS_MSG = @RS_MSG + ' (LOT STATUS :' + @PS_LOTSTATUSNM + ' )'
			--	RETURN
			--END

			SELECT @PS_ITEMCD = ISNULL(ITEM_CD,'')
			  FROM PP0040 WITH (NOLOCK)
			 WHERE LOT_NO = @PS_PRODLOT

			IF(@PS_ITEMCD = '')
			BEGIN
				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '해당 JIG의 품목정보가 없습니다.', @LANG, @RS_MSG OUTPUT;
				RETURN
			END

			SELECT @PS_ROUTEID = ISNULL(ROUTE_ID,'')
			  FROM BM0130 WITH (NOLOCK)
			 WHERE ITEM_CD = @PS_ITEMCD

			IF(@PS_ROUTEID = '')
			BEGIN
				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '해당 JIG의 품목의 Route 정보가 없습니다.', @LANG, @RS_MSG OUTPUT;
				RETURN
			END

			SELECT @PI_WORKNO = ISNULL(WORK_NO, -1)
			  FROM BM0132 WITH (NOLOCK)
			 WHERE ROUTE_ID = @PS_ROUTEID
			   AND OP_CD    = @PS_OPCD

			IF(@PI_WORKNO = -1)
			BEGIN
				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '해당 설비의 공정이 Route에 편성되어 있지 않습니다.', @LANG, @RS_MSG OUTPUT;
				RETURN
			END

			SELECT TOP(1) @PI_WORKNO = ISNULL(WORK_NO, -1)
			  FROM BM0132 WITH (NOLOCK)
			 WHERE ROUTE_ID = @PS_ROUTEID
			   AND OP_CD    = @PS_OPCD
			   AND WORK_NO  < @PI_WORKNO
			 ORDER BY WORK_NO DESC

			IF(@PI_WORKNO = -1)
			BEGIN
				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '해당 설비의 전공정이 Route에 편성되어 있지 않습니다.', @LANG, @RS_MSG OUTPUT;
				RETURN
			END

			IF(@PI_WORKNO <> 1)
			BEGIN

    			SELECT TOP(1) @PS_LASTOPCD = ISNULL(OP_CD, '')
    			  FROM BM0132 WITH (NOLOCK)
    			 WHERE ROUTE_ID = @PS_ROUTEID
    			   AND OP_CD    = @PS_OPCD
    			   AND WORK_NO  < @PI_WORKNO
    			 ORDER BY WORK_NO DESC
    
    			IF(@PS_OPCD = '')
    			BEGIN
					SET @RS_CODE = 'E'
					EXEC DBO.USP_GET_TRANSLATION '해당 설비의 전공정이 Route에 편성되어 있지 않습니다.', @LANG, @RS_MSG OUTPUT;
					RETURN
    
    			END

    			IF(@PS_LASTOPCD <> @PS_JIGOPCD)
    			BEGIN

					SET @RS_CODE = 'E'
					EXEC DBO.USP_GET_TRANSLATION '해당 JIG의 마지막 작업공정이 Route상 전공정이 아닙니다.', @LANG, @RS_MSG OUTPUT;
					RETURN
    			END

    			IF(@PD_INDT IS NOT NULL AND @PD_OUTDT IS NULL)
    			BEGIN
					SET @RS_CODE = 'E'
					EXEC DBO.USP_GET_TRANSLATION '해당 JIG가 투입이 가능한 상태가 아닙니다. 전공정 투입이력 존재, 배출이력 미존재', @LANG, @RS_MSG OUTPUT;
					RETURN
    			END

			END

			-- 2025.06.23 수정 (김영주) (원본)
			--SELECT @PI_CNT = COUNT(1)
			--  FROM PP0040 WITH (NOLOCK)
			-- WHERE LOT_NO <> @PS_PRODLOT
			--   AND WC_CD  = @PS_WCCD
			--   AND IN_DT IS NOT NULL -- PP0040으 IN_DT는 CELL의 IN_DT 시간을 의미하는것으로 변경되었음으로 PP8000의 JIG_INDT로 변경

			--SELECT @PI_CNT = COUNT(1)
			--  FROM PP0040 A WITH (NOLOCK)
			--	LEFT JOIN PP8000 B ON B.JIG_ID = A.JIG_ID
			-- WHERE A.LOT_NO <> @PS_PRODLOT
			--   AND A.WC_CD  = @PS_WCCD
			--   AND B.JIG_INDT IS NOT NULL

			--IF(@PI_CNT > 0 AND @PS_OPCD <> 'F30-0800')
			--BEGIN
			--	SET @RS_CODE = 'E'
			--	EXEC DBO.USP_GET_TRANSLATION '해당 작업장에 현재 다른 LOT가 작업중에 있습니다.', @LANG, @RS_MSG OUTPUT;
			--	RETURN
			--END

			-- 투입지그 SLOT 기준으로 이전공인지 체크하는 제약조건 추가 2025.08.12
			-- 투입하기 위해서는 반드시 이전공정에 있어야함으로 다음 로직을 적용하여 오류제거
			IF EXISTS ( SELECT 1
						FROM PP8010 A WITH (NOLOCK)
							LEFT JOIN PP0040 B WITH (NOLOCK) ON B.PLANT_CD = A.PLANT_CD AND ( CASE WHEN A.CELL_ID IS NULL THEN B.SHEET_ID ELSE B.CELL_ID END ) = ( CASE WHEN A.CELL_ID IS NULL THEN A.SHEET_ID ELSE A.CELL_ID END )
							LEFT JOIN AP0020 C WITH (NOLOCK) ON C.PLANT_CD = B.PLANT_CD AND C.OR_NO   = B.OR_NO
							LEFT JOIN AP0020 D WITH (NOLOCK) ON D.PLANT_CD = C.PLANT_CD AND D.PLAN_NO = C.PLAN_NO AND D.OP_CD = @PS_OPCD
						WHERE 1=1
							AND A.JIG_ID   = @AS_JIGID
							AND A.LOT_NO IS NOT NULL -- 비어있는 SLOT 제외  
							AND CASE WHEN D.WORK_NO - C.WORK_NO = 1 THEN 'Y' ELSE 'N' END  = 'N' -- 현재지그에 담긴 지그의 SLOT의 가장 마지막 상태 작지정보와 공정정보를 기준으로 현재 투입하고자 하는 공정의 차이가 1이 아닌건 ( 이미지났거나 이전공정이 아닌건 걸러내기 )
							)
			BEGIN
				DECLARE @PS_NOWOPNM NVARCHAR(100)
					,   @PS_MSG     NVARCHAR(100)

				SELECT  TOP 1
					@PS_NOWOPNM = E.OP_NM
				FROM PP8010 A WITH (NOLOCK)
					LEFT JOIN PP0040 B WITH (NOLOCK) ON B.PLANT_CD = A.PLANT_CD AND( CASE WHEN A.CELL_ID IS NULL THEN B.SHEET_ID ELSE B.CELL_ID END ) = ( CASE WHEN A.CELL_ID IS NULL THEN A.SHEET_ID ELSE A.CELL_ID END )
					LEFT JOIN AP0020 C WITH (NOLOCK) ON C.PLANT_CD = A.PLANT_CD AND C.OR_NO   = B.OR_NO
					LEFT JOIN AP0020 D WITH (NOLOCK) ON D.PLANT_CD = C.PLANT_CD AND D.PLAN_NO = C.PLAN_NO AND D.OP_CD = @PS_OPCD
					LEFT JOIN BM0040 E WITH (NOLOCK) ON E.PLANT_CD = C.PLANT_CD AND E.OP_CD   = C.OP_CD
				WHERE 1=1
					AND A.JIG_ID = @AS_JIGID
					AND A.LOT_NO IS NOT NULL -- 비어있는 SLOT 제외  
					AND CASE WHEN D.WORK_NO - C.WORK_NO = 1 THEN 'Y' ELSE 'N' END  = 'N' -- 현재지그에 담긴 지그의 SLOT의 가장 마지막 상태 작지정보와 공정정보를 기준으로 현재 투입하고자 하는 공정의 차이가 1이 아닌건 ( 이미지났거나 이전공정이 아닌건 걸러내기 )


				SET @RS_CODE = 'E'
				EXEC DBO.USP_GET_TRANSLATION '스캔된 지그는 현재 공정 순서상 이 공정에 투입할 수 없습니다. 지그의 마지막작업공정 : ' , @LANG, @RS_MSG OUTPUT;
				SET @RS_MSG  = @RS_MSG + @PS_NOWOPNM
				RETURN
			END
		END



		SET @RS_CODE = 'S'
		SET @RS_MSG  = ''

	END;


END TRY
BEGIN CATCH

	INSERT INTO SY9000 ( ERR_SP, ERR_NO, ERR_LINE, ERR_MSG, ERR_DT )
	                   SELECT ERROR_PROCEDURE(), ERROR_NUMBER(), ERROR_LINE(), ERROR_MESSAGE(), GETDATE();

	SET @RS_CODE = 'E'
	SET @RS_MSG  = '[IF_JIG_INTERLOCK] ' + ERROR_MESSAGE();	

END CATCH
